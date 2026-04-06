// src/app/api/auth/naver/callback/route.ts — Naver OAuth 콜백
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createToken } from '@/lib/auth/jwt';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=oauth_code_missing', req.url));
  }

  try {
    const redirectUri =
      process.env.NAVER_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/naver/callback`;

    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
        state,
      }),
    });

    if (!tokenRes.ok) {
      console.error('[Naver OAuth] token exchange failed', await tokenRes.text());
      return NextResponse.redirect(new URL('/login?error=oauth_token_failed', req.url));
    }

    const { access_token } = await tokenRes.json();

    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error('[Naver OAuth] userinfo failed', await userRes.text());
      return NextResponse.redirect(new URL('/login?error=oauth_userinfo_failed', req.url));
    }

    const { response: naverUser } = await userRes.json();
    const naverId = String(naverUser.id);
    const email = naverUser.email ?? `naver_${naverId}@naver.local`;
    const name = naverUser.name ?? naverUser.nickname ?? '네이버 사용자';
    const picture = naverUser.profile_image ?? null;

    // 1. naver_id로 기존 계정 찾기
    let user = await prisma.vf_users.findFirst({ where: { naver_id: naverId } });

    // 2. 없으면 이메일로 찾아서 naver_id 연동
    if (!user) {
      user = await prisma.vf_users.findUnique({ where: { email } });
      if (user) {
        user = await prisma.vf_users.update({
          where: { id: user.id },
          data: { naver_id: naverId, profile_image_url: picture ?? user.profile_image_url },
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
          provider: 'naver',
          naver_id: naverId,
          profile_image_url: picture,
          role: 'user',
        },
      });
    }

    const token = createToken({ sub: user.id, email: user.email, role: user.role ?? 'user' });
    return NextResponse.redirect(new URL(`/?token=${token}`, req.url));
  } catch (error) {
    console.error('[Naver OAuth] callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_server_error', req.url));
  }
}
