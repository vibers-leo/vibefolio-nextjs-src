// src/app/api/recruit-items/route.ts — Prisma (NCP PostgreSQL)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';
import { isAdminEmail } from '@/lib/auth/admins';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search')?.trim() || '';
    const sort = searchParams.get('sort') || 'deadline';
    const offset = (page - 1) * limit;

    const where: any = { is_approved: true, is_active: true };
    if (type && type !== 'all') where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any =
      sort === 'views' ? { views_count: 'desc' }
      : sort === 'created' ? { created_at: 'desc' }
      : { date: 'asc' };

    const [total, items] = await Promise.all([
      prisma.vf_recruit_items.count({ where }),
      prisma.vf_recruit_items.findMany({ where, orderBy, skip: offset, take: limit }),
    ]);

    // deadline 정렬: 마감 임박 먼저, 마감된 건 뒤로
    let sortedItems = items as any[];
    if (sort === 'deadline') {
      const today = new Date().toISOString().split('T')[0];
      sortedItems = sortedItems.sort((a, b) => {
        const expiredA = !a.date || a.date < today;
        const expiredB = !b.date || b.date < today;
        if (expiredA !== expiredB) return expiredA ? 1 : -1;
        if (!expiredA) return (a.date || '').localeCompare(b.date || '');
        return (b.date || '').localeCompare(a.date || '');
      });
    }

    return NextResponse.json({ items: sortedItems, total, page, limit, hasMore: offset + limit < total });
  } catch (error) {
    console.error('Error fetching recruit items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser || !isAdminEmail(authUser.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const item = await prisma.vf_recruit_items.create({
      data: { ...body, is_active: true },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error creating recruit item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
