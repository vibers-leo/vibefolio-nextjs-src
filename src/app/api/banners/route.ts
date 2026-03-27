import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 배너 목록 조회 (Prisma — self-hosted PostgreSQL)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // 기본값 true

    const banners = await prisma.banners.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { display_order: 'asc' },
    });

    return NextResponse.json({ banners });
  } catch (error) {
    console.error('배너 조회 실패:', error);
    return NextResponse.json(
      { error: '배너를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

// 배너 생성 (Prisma)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subtitle, image_url, link_url, display_order } = body;

    const banner = await prisma.banners.create({
      data: {
        title,
        subtitle,
        image_url,
        link_url,
        display_order: display_order || 0,
        is_active: true,
      },
    });

    return NextResponse.json({ banner });
  } catch (error) {
    console.error('배너 생성 실패:', error);
    return NextResponse.json(
      { error: '배너 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
