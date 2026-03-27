// src/lib/auth/validate.ts — API 라우트용 JWT 인증 헬퍼
import { NextRequest } from 'next/server';
import { verifyToken, extractToken } from './jwt';
import prisma from '@/lib/db';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

/**
 * API Route에서 JWT 토큰 검증 → 유저 반환
 * Authorization: Bearer <token> 헤더 사용
 */
export async function validateUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  const token = extractToken(authHeader);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

/**
 * DB에서 유저 프로필 조회 포함 (role 확인 등 필요 시)
 */
export async function validateUserWithProfile(request: NextRequest) {
  const user = await validateUser(request);
  if (!user) return null;

  try {
    const profile = await prisma.vf_users.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, nickname: true, username: true, profile_image_url: true, role: true, points: true },
    });
    if (!profile) return null;
    return { ...user, profile };
  } catch {
    return user;
  }
}
