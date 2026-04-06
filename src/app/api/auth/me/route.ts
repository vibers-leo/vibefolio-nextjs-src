// src/app/api/auth/me/route.ts
// 현재 유저 정보 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/auth/validate';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.vf_users.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        nickname: true,
        username: true,
        profile_image_url: true,
        role: true,
        points: true,
        interests: true,
        expertise: true,
        google_id: true,
        kakao_id: true,
        naver_id: true,
        password_hash: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: '유저를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { password_hash, ...safeUser } = user;

    return NextResponse.json({
      user: {
        ...safeUser,
        has_password: !!password_hash,
      },
    });
  } catch (error) {
    console.error('[Auth/Me] 서버 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
