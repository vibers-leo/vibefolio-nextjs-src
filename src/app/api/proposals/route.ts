// src/app/api/proposals/route.ts — Prisma
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';

export async function GET(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    let where: any = {};
    if (type === 'sent') {
      where.user_id = authUser.id;
    } else if (type === 'received') {
      // vf_proposals 에는 receiver가 없으므로 user_id 기준
      where.user_id = authUser.id;
    } else {
      where.user_id = authUser.id;
    }

    const proposals = await prisma.vf_proposals.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ proposals });
  } catch (error: any) {
    console.error('서버 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    const proposal = await prisma.vf_proposals.create({
      data: {
        user_id: authUser.id,
        title,
        content,
        status: 'pending',
      },
    });

    return NextResponse.json({ proposal, message: '제안이 성공적으로 전송되었습니다.' });
  } catch (error: any) {
    console.error('서버 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
