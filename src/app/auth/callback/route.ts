// src/app/auth/callback/route.ts — OAuth 콜백 (Supabase SSR 제거됨)
// JWT 기반 인증 전환 후 이 라우트는 레거시. 향후 제거 예정.
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next')

  // Supabase Auth 제거됨 — OAuth 콜백 비활성화
  console.warn('[Auth Callback] Supabase Auth 제거됨. JWT 기반 /api/auth/login 사용.');

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('OAuth 인증이 비활성화되었습니다. 이메일 로그인을 사용해주세요.')}`
  )
}
