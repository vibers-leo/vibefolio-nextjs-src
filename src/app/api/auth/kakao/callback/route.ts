// src/app/api/auth/kakao/callback/route.ts — Kakao OAuth 콜백
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
      process.env.KAKAO_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/kakao/callback`;

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID!,
        client_secret: process.env.KAKAO_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      console.error('[Kakao OAuth] token exchange failed', await tokenRes.text());
      return NextResponse.redirect(new URL('/login?error=oauth_token_failed', req.url));
    }

    const { access_token } = await tokenRes.json();

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error('[Kakao OAuth] userinfo failed', await userRes.text());
      return NextResponse.redirect(new URL('/login?error=oauth_userinfo_failed', req.url));
    }

    const kakaoUser = await userRes.json();
    const kakaoId = String(kakaoUser.id);
    const kakaoAccount = kakaoUser.kakao_account ?? {};
    const email = kakaoAccount.email ?? `kakao_${kakaoId}@kakao.local`;
    const name = kakaoAccount.profile?.nickname ?? '카카오 사용자';
    const picture = kakaoAccount.profile?.profile_image_url ?? null;

    // 1. kakao_id로 기존 계정 찾기
    let user = await prisma.vf_users.findFirst({ where: { kakao_id: kakaoId } });

    // 2. 없으면 이메일로 찾아서 kakao_id 연동
    if (!user) {
      user = await prisma.vf_users.findUnique({ where: { email } });
      if (user) {
        user = await prisma.vf_users.update({
          where: { id: user.id },
          data: { kakao_id: kakaoId, profile_image_url: picture ?? user.profile_image_url },
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
          provider: 'kakao',
          kakao_id: kakaoId,
          profile_image_url: picture,
          role: 'user',
        },
      });
    }

    const token = createToken({ sub: user.id, email: user.email, role: user.role ?? 'user' });
    return NextResponse.redirect(new URL(`/?token=${token}`, req.url));
  } catch (error) {
    console.error('[Kakao OAuth] callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_server_error', req.url));
  }
}
