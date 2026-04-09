// src/app/api/auth/mobile/[provider]/route.ts — 모바일 앱 소셜 로그인
// access_token을 받아 유저 정보 조회 후 JWT 반환
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createToken } from '@/lib/auth/jwt';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!['google', 'kakao'].includes(provider)) {
    return NextResponse.json({ error: '지원하지 않는 제공자입니다.' }, { status: 400 });
  }

  let body: { access_token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { access_token } = body;
  if (!access_token) {
    return NextResponse.json({ error: 'access_token이 필요합니다.' }, { status: 400 });
  }

  try {
    let userId: string;
    let email: string;
    let name: string;
    let picture: string | null;

    if (provider === 'google') {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!userRes.ok) {
        return NextResponse.json({ error: 'Google 인증 실패' }, { status: 401 });
      }
      const data = await userRes.json();
      userId = data.id;
      email = data.email;
      name = data.name ?? email.split('@')[0];
      picture = data.picture ?? null;
    } else {
      // kakao
      const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!userRes.ok) {
        return NextResponse.json({ error: 'Kakao 인증 실패' }, { status: 401 });
      }
      const kakaoUser = await userRes.json();
      const kakaoAccount = kakaoUser.kakao_account ?? {};
      userId = String(kakaoUser.id);
      email = kakaoAccount.email ?? `kakao_${userId}@kakao.local`;
      name = kakaoAccount.profile?.nickname ?? '카카오 사용자';
      picture = kakaoAccount.profile?.profile_image_url ?? null;
    }

    const idField = provider === 'google' ? 'google_id' : 'kakao_id';

    // 1. provider_id로 기존 계정 찾기
    let user = await prisma.vf_users.findFirst({ where: { [idField]: userId } });

    // 2. 없으면 이메일로 찾아서 연동
    if (!user) {
      user = await prisma.vf_users.findUnique({ where: { email } });
      if (user) {
        user = await prisma.vf_users.update({
          where: { id: user.id },
          data: { [idField]: userId, profile_image_url: picture ?? user.profile_image_url },
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
          provider,
          [idField]: userId,
          profile_image_url: picture,
          role: 'user',
        },
      });
    }

    const token = createToken({ sub: user.id, email: user.email, role: user.role ?? 'user' });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        username: user.username,
        profile_image_url: user.profile_image_url,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`[Mobile Auth/${provider}] error:`, error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
