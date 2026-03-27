// src/app/api/auth/login/route.ts
// 로그인 API — Prisma + bcrypt + JWT

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 유저 조회
    const user = await prisma.vf_users.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 검증
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 발급
    const token = createToken({ sub: user.id, email: user.email, role: user.role || 'user' });

    return NextResponse.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        username: user.username,
        profile_image_url: user.profile_image_url,
        role: user.role,
        points: user.points,
      },
      token,
    });
  } catch (error) {
    console.error('로그인 서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
