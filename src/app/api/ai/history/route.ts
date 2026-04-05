import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/auth/validate';

// ai_chat_sessions 테이블 미구현 — 히스토리 비어있음 처리
export async function GET(request: NextRequest) {
  const user = await validateUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ history: [] });
}
