import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const projects = await prisma.vf_projects.findMany({
      where: {
        deleted_at: null,
        visibility: 'public',
        OR: [
          { scheduled_at: null },
          { scheduled_at: { lte: new Date() } },
        ],
      },
      orderBy: { created_at: 'desc' },
      select: {
        project_id: true,
        title: true,
        content_text: true,
        created_at: true,
        scheduled_at: true,
        custom_data: true,
      },
    });

    // custom_data.tags에 '공지사항' 포함된 것만 필터
    const notices = projects.filter((p) => {
      const cd = p.custom_data as any;
      const tags: string[] = cd?.tags || [];
      return tags.includes('공지사항') || tags.includes('Notice') || tags.includes('공지');
    });

    return NextResponse.json({ notices });
  } catch (error) {
    console.error('공지사항 조회 실패:', error);
    return NextResponse.json({ notices: [] });
  }
}
