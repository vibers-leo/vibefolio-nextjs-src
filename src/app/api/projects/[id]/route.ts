// src/app/api/projects/[id]/route.ts
// 개별 프로젝트 조회, 수정, 삭제 API — Prisma

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';
import { isAdminEmail } from '@/lib/auth/admins';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authUser = await validateUser(request);

    const data = await prisma.vf_projects.findUnique({
      where: { project_id: parseInt(id) },
      include: {
        vf_users: {
          select: { id: true, username: true, nickname: true, profile_image_url: true },
        },
      },
    });

    if (!data) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    const isOwner = authUser && authUser.id === data.user_id;
    const isPublic = !data.visibility || data.visibility === 'public';
    if (!isPublic && !isOwner) {
      return NextResponse.json({ error: '접근 권한이 없습니다. (비공개 프로젝트)' }, { status: 403 });
    }

    // 조회수 증가 — 응답 블로킹 없이 fire-and-forget
    prisma.vf_projects.update({
      where: { project_id: parseInt(id) },
      data: { views_count: (data.views_count || 0) + 1 },
    }).catch(() => {});

    const { vf_users, ...projectData } = data;
    const project: any = {
      ...projectData,
      User: vf_users ? {
        user_id: vf_users.id,
        username: vf_users.username || vf_users.nickname || 'Unknown',
        profile_image_url: vf_users.profile_image_url || '/globe.svg',
      } : null,
    };

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('서버 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    // 관리자 확인
    const isAdmin = isAdminEmail(authUser.email);

    // 기존 프로젝트 조회
    const existing = await prisma.vf_projects.findUnique({
      where: { project_id: parseInt(id) },
      select: { user_id: true, custom_data: true },
    });
    if (!existing) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (!isAdmin && existing.user_id !== authUser.id) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title, content_text, content, body: bodyContent, text,
      description, summary, alt_description,
      thumbnail_url, category_id, rendering_type, custom_data,
      allow_michelin_rating, allow_stickers, allow_secret_comments,
      scheduled_at, visibility, assets
    } = body;

    let finalContent = content_text || content || bodyContent || text;

    // custom_data 머지
    let finalCustomData: any = undefined;
    if (custom_data !== undefined || assets !== undefined || summary !== undefined || alt_description !== undefined) {
      try {
        let baseData = (existing.custom_data && typeof existing.custom_data === 'object') ? existing.custom_data as any : {};
        let newCustom: any = {};
        if (custom_data) {
          newCustom = typeof custom_data === 'string' ? JSON.parse(custom_data) : custom_data;
        }
        finalCustomData = { ...baseData, ...newCustom };
        if (assets) finalCustomData.assets = assets;
        if (summary !== undefined) finalCustomData.summary = summary;
        if (alt_description !== undefined) finalCustomData.alt_description = alt_description;
      } catch (e) {
        console.error('[API] PUT Custom Data Merge Error:', e);
      }
    }

    const updatePayload: any = { updated_at: new Date() };
    if (title !== undefined) updatePayload.title = title;
    if (finalContent !== undefined) updatePayload.content_text = finalContent;
    if (description !== undefined) updatePayload.description = description;
    if (thumbnail_url !== undefined) updatePayload.thumbnail_url = thumbnail_url;
    if (category_id !== undefined) updatePayload.category_id = typeof category_id === 'number' ? category_id : parseInt(category_id);
    if (rendering_type !== undefined) updatePayload.rendering_type = rendering_type;
    if (finalCustomData !== undefined) updatePayload.custom_data = finalCustomData;
    if (allow_michelin_rating !== undefined) updatePayload.allow_michelin_rating = allow_michelin_rating;
    if (allow_stickers !== undefined) updatePayload.allow_stickers = allow_stickers;
    if (allow_secret_comments !== undefined) updatePayload.allow_secret_comments = allow_secret_comments;
    if (scheduled_at !== undefined) updatePayload.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;
    if (visibility !== undefined) updatePayload.visibility = visibility;

    const updatedProject = await prisma.vf_projects.update({
      where: { project_id: parseInt(id) },
      data: updatePayload,
    });

    return NextResponse.json({ message: '프로젝트가 수정되었습니다.', data: updatedProject });
  } catch (error: any) {
    console.error('서버 오류:', error);
    return NextResponse.json({ error: '서버 오류', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const isAdmin = isAdminEmail(authUser.email);
    const project = await prisma.vf_projects.findUnique({
      where: { project_id: parseInt(id) },
      select: { user_id: true },
    });
    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    if (!isAdmin && project.user_id !== authUser.id) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    // Soft Delete
    await prisma.vf_projects.update({
      where: { project_id: parseInt(id) },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ message: '프로젝트가 삭제되었습니다.' });
  } catch (error: any) {
    return NextResponse.json({ error: '서버 오류', details: error.message }, { status: 500 });
  }
}
