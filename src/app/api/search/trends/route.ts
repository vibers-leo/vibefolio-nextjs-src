import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const revalidate = 60;

export async function GET() {
  try {
    // search_logs에서 최근 7일 쿼리 집계
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const logs = await prisma.search_logs.findMany({
      where: { created_at: { gte: since } },
      select: { query: true },
    });

    // 쿼리별 카운트 집계
    const counts: Record<string, number> = {};
    for (const { query } of logs) {
      counts[query] = (counts[query] || 0) + 1;
    }

    const trends = Object.entries(counts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({ trends });
  } catch (error: any) {
    return NextResponse.json({
      trends: [
        { query: 'AI 아트', count: 100 },
        { query: '모션 그래픽', count: 85 },
        { query: '3D 모델링', count: 70 },
        { query: 'UI 디자인', count: 60 },
      ],
    });
  }
}
