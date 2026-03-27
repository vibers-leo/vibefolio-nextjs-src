import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 배너 수정 (Prisma — self-hosted PostgreSQL)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { title, subtitle, image_url, link_url, display_order, is_active } = body;

    const banner = await prisma.banners.update({
      where: { id },
      data: {
        title,
        subtitle,
        image_url,
        link_url,
        display_order,
        is_active,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ banner });
  } catch (error) {
    console.error('배너 수정 실패:', error);
    return NextResponse.json(
      { error: '배너 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 배너 삭제 (Prisma)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.banners.delete({
      where: { id },
    });

    return NextResponse.json({ message: '배너가 삭제되었습니다.' });
  } catch (error) {
    console.error('배너 삭제 실패:', error);
    return NextResponse.json(
      { error: '배너 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
