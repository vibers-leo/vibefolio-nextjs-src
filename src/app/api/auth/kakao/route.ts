// src/app/api/auth/kakao/route.ts — Kakao OAuth 시작
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID!;
  const redirectUri =
    process.env.KAKAO_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/kakao/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  });

  return NextResponse.redirect(
    `https://kauth.kakao.com/oauth/authorize?${params.toString()}`,
  );
}
