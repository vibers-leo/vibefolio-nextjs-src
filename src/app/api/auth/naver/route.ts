// src/app/api/auth/naver/route.ts — Naver OAuth 시작
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID!;
  const redirectUri =
    process.env.NAVER_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/naver/callback`;
  const state = crypto.randomBytes(8).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(
    `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`,
  );
}
