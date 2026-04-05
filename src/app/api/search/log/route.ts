import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const user = await validateUser(request);

    await prisma.search_logs.create({
      data: {
        query: query.trim(),
        user_id: user?.id ?? null,
        results_count: 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // 로그 저장 실패는 무시
    return NextResponse.json({ success: true });
  }
}
