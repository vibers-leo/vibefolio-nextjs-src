// src/app/api/auth/signup/route.ts
// 회원가입 API — Prisma + bcrypt

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nickname } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existing = await prisma.vf_users.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해싱 및 유저 생성
    const password_hash = await hashPassword(password);
    const user = await prisma.vf_users.create({
      data: {
        email,
        password_hash,
        nickname: nickname || email.split('@')[0],
        username: email.split('@')[0] + '_' + Date.now().toString(36),
        role: 'user',
        points: 0,
      },
    });

    // JWT 토큰 발급
    const token = createToken({ sub: user.id, email: user.email, role: user.role || 'user' });

    return NextResponse.json({
      message: '회원가입 성공',
      user: { id: user.id, email: user.email, nickname: user.nickname },
      token,
    });
  } catch (error) {
    console.error('회원가입 서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
