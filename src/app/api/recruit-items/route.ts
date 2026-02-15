// src/app/api/recruit-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// GET: 활성 항목 조회 (페이지네이션 + 검색 + 정렬)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search')?.trim() || '';
    const sort = searchParams.get('sort') || 'deadline'; // deadline | created | views

    const offset = (page - 1) * limit;

    // 공통 필터: 승인됨 + 활성
    let countQuery = supabaseAdmin
      .from('recruit_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)
      .eq('is_active', true);

    let dataQuery = supabaseAdmin
      .from('recruit_items')
      .select('*')
      .eq('is_approved', true)
      .eq('is_active', true);

    // 타입 필터
    if (type && type !== 'all') {
      countQuery = countQuery.eq('type', type);
      dataQuery = dataQuery.eq('type', type);
    }

    // 검색
    if (search) {
      const searchFilter = `title.ilike.%${search}%,description.ilike.%${search}%,company.ilike.%${search}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    // 정렬
    if (sort === 'views') {
      dataQuery = dataQuery.order('views_count', { ascending: false, nullsFirst: false });
    } else if (sort === 'created') {
      dataQuery = dataQuery.order('created_at', { ascending: false });
    } else {
      // deadline: 마감일 오름차순 (임박한 것 먼저)
      dataQuery = dataQuery.order('date', { ascending: true });
    }

    // 페이지네이션
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    // 병렬 실행
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) throw countResult.error;
    if (dataResult.error) throw dataResult.error;

    const total = countResult.count || 0;

    return NextResponse.json({
      items: dataResult.data || [],
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Error fetching recruit items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST: 새 항목 추가 (관리자만)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('recruit_items')
      .insert({
        ...body,
        is_crawled: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Error creating recruit item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
