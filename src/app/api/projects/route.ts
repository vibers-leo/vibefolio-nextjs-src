import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';
import { GENRE_TO_CATEGORY_ID } from '@/lib/constants';

// 캐시 설정
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'latest';
    const offset = (page - 1) * limit;
    const field = searchParams.get('field');
    const mode = searchParams.get('mode');

    // 인증 유저 확인 (선택적)
    const authUser = await validateUser(request);

    // WHERE 조건 구성
    const where: any = {
      deleted_at: null,
    };

    // visibility 필터
    if (!(userId && authUser && authUser.id === userId)) {
      const nowISO = new Date().toISOString();
      if (mode === 'growth' || mode === 'audit') {
        where.visibility = { in: ['public', 'unlisted'] };
      } else {
        where.visibility = 'public';
      }
      where.OR = [
        { scheduled_at: null },
        { scheduled_at: { lte: new Date() } },
      ];
    }

    // 검색어 필터
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content_text: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // 카테고리 필터
    if (category && category !== 'all' && category !== 'korea') {
      const categoryId = GENRE_TO_CATEGORY_ID[category];
      if (categoryId) where.category_id = categoryId;
    }

    if (userId) where.user_id = userId;

    // 정렬
    let orderBy: any = { created_at: 'desc' };
    if (sortBy === 'popular' || sortBy === 'views') {
      orderBy = { views_count: 'desc' };
    } else if (sortBy === 'likes') {
      orderBy = { likes_count: 'desc' };
    }

    const [data, count] = await Promise.all([
      prisma.vf_projects.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          project_id: true,
          user_id: true,
          category_id: true,
          title: true,
          rendering_type: true,
          thumbnail_url: true,
          views_count: true,
          likes_count: true,
          created_at: true,
          content_text: true,
          description: true,
          custom_data: true,
          allow_michelin_rating: true,
          allow_stickers: true,
          allow_secret_comments: true,
          visibility: true,
          scheduled_at: true,
          audit_deadline: true,
          is_feedback_requested: true,
        },
      }),
      prisma.vf_projects.count({ where }),
    ]);

    // 작성자 정보 병합
    const projects = data as any[];
    if (projects.length > 0) {
      const userIds = [...new Set(projects.map((p) => p.user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const users = await prisma.vf_users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, nickname: true, profile_image_url: true, expertise: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));

        projects.forEach((project: any) => {
          const u = userMap.get(project.user_id);
          project.users = u ? {
            username: u.username || u.nickname || 'Unknown',
            avatar_url: u.profile_image_url || '/globe.svg',
            expertise: u.expertise || null,
          } : { username: 'Unknown', avatar_url: '/globe.svg' };
          project.User = project.users;
        });
      }
    }

    return NextResponse.json({
      projects,
      data: projects,
      metadata: {
        total: count || 0,
        page,
        limit,
        hasMore: projects.length === limit,
      },
    });
  } catch (error: any) {
    console.error('서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication Required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await request.json();
    let {
      category_id, title, summary,
      content_text, content, body: bodyContent, text,
      description, alt_description, thumbnail_url, rendering_type, custom_data,
      allow_michelin_rating, allow_stickers, allow_secret_comments, scheduled_at, visibility,
      assets, audit_deadline, is_feedback_requested,
    } = body;

    // Content 정규화
    let finalContent = content_text || content || bodyContent || text || '';
    if (!finalContent && description) finalContent = description;

    const user_id = authUser.id;

    // category_id 파싱
    if (category_id && typeof category_id === 'string') {
      const parsedNum = Number(category_id);
      if (!isNaN(parsedNum)) {
        category_id = parsedNum;
      } else {
        category_id = GENRE_TO_CATEGORY_ID[category_id.toLowerCase()] || 1;
      }
    } else if (typeof category_id !== 'number') {
      category_id = 1;
    }
    if (isNaN(category_id)) category_id = 1;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.', code: 'MISSING_TITLE' }, { status: 400 });
    }

    // 유저 존재 확인
    const userExists = await prisma.vf_users.findUnique({ where: { id: user_id }, select: { id: true } });
    if (!userExists) {
      return NextResponse.json({ error: `User Not Found: ${user_id}`, code: 'USER_NOT_FOUND' }, { status: 400 });
    }

    // custom_data 구성
    let finalCustomData: any = {};
    try {
      if (custom_data) {
        finalCustomData = typeof custom_data === 'string' ? JSON.parse(custom_data) : custom_data;
      }
      if (assets) finalCustomData.assets = assets;
      finalCustomData.summary = summary;
      finalCustomData.alt_description = alt_description;
    } catch {
      finalCustomData = { assets: assets || [] };
    }

    const project = await prisma.vf_projects.create({
      data: {
        user_id,
        category_id,
        title,
        content_text: finalContent,
        description: description || finalContent,
        thumbnail_url,
        rendering_type: rendering_type || 'rich_text',
        custom_data: finalCustomData,
        allow_michelin_rating: allow_michelin_rating ?? true,
        allow_stickers: allow_stickers ?? true,
        allow_secret_comments: allow_secret_comments ?? true,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        visibility: visibility || 'public',
        is_feedback_requested: is_feedback_requested ?? false,
        audit_deadline: audit_deadline ? new Date(audit_deadline) : null,
        likes_count: 0,
        views_count: 0,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    console.error('서버 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
