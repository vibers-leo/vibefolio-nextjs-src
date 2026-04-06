// src/app/api/auth/google/callback/route.ts — Google OAuth 콜백
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createToken } from '@/lib/auth/jwt';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_code_missing', req.url));
  }

  try {
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[Google OAuth] token exchange failed', await tokenRes.text());
      return NextResponse.redirect(new URL('/login?error=oauth_token_failed', req.url));
    }

    const { access_token } = await tokenRes.json();

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error('[Google OAuth] userinfo failed', await userRes.text());
      return NextResponse.redirect(new URL('/login?error=oauth_userinfo_failed', req.url));
    }

    const { id, email, name, picture } = await userRes.json();

    // 1. google_id로 기존 계정 찾기
    let user = await prisma.vf_users.findFirst({ where: { google_id: id } });

    // 2. 없으면 이메일로 찾아서 google_id 연동
    if (!user) {
      user = await prisma.vf_users.findUnique({ where: { email } });
      if (user) {
        user = await prisma.vf_users.update({
          where: { id: user.id },
          data: { google_id: id, profile_image_url: picture ?? user.profile_image_url },
        });
      }
    }

    // 3. 신규 생성
    if (!user) {
      user = await prisma.vf_users.create({
        data: {
          email,
          nickname: name,
          username: email.split('@')[0] + '_' + crypto.randomBytes(3).toString('hex'),
          provider: 'google',
          google_id: id,
          profile_image_url: picture,
          role: 'user',
        },
      });
    }

    const token = createToken({ sub: user.id, email: user.email, role: user.role ?? 'user' });

    // 바이버스 생태계 연결 (fire-and-forget)
    fetch(`${process.env.VIBERS_SITE_URL ?? 'https://vibers.co.kr'}/api/vibers/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-vibers-secret': process.env.VIBERS_CONNECT_SECRET ?? '' },
      body: JSON.stringify({ type: 'join', brandSlug: 'vibefolio-nextjs', userEmail: user.email, userName: user.nickname }),
    }).catch(() => {});

    return NextResponse.redirect(new URL(`/?token=${token}`, req.url));
  } catch (error) {
    console.error('[Google OAuth] callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_server_error', req.url));
  }
}
