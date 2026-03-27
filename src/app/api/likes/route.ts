// src/app/api/likes/route.ts — Prisma
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';

export async function POST(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const userId = authUser.id;

    const body = await request.json();
    const targetProjectId = body.projectId || body.project_id;
    if (!targetProjectId) {
      return NextResponse.json({ error: '프로젝트 ID가 필요합니다.' }, { status: 400 });
    }

    const projectId = Number(targetProjectId);

    // 기존 좋아요 확인
    const existing = await prisma.vf_likes.findUnique({
      where: { user_id_project_id: { user_id: userId, project_id: projectId } },
    });

    if (existing) {
      await prisma.vf_likes.delete({
        where: { user_id_project_id: { user_id: userId, project_id: projectId } },
      });
      return NextResponse.json({ liked: false, message: '좋아요 취소' });
    } else {
      await prisma.vf_likes.create({
        data: { user_id: userId, project_id: projectId },
      });
      return NextResponse.json({ liked: true, message: '좋아요 추가' });
    }
  } catch (error) {
    console.error('[Likes] Error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');

    if (userId && projectId) {
      const like = await prisma.vf_likes.findUnique({
        where: { user_id_project_id: { user_id: userId, project_id: Number(projectId) } },
      });
      return NextResponse.json({ liked: !!like });
    } else if (userId) {
      const likes = await prisma.vf_likes.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      if (likes.length > 0) {
        const projectIds = likes.map((l) => l.project_id);
        const projects = await prisma.vf_projects.findMany({
          where: { project_id: { in: projectIds } },
          select: { project_id: true, title: true, thumbnail_url: true, user_id: true },
        });

        const userIds = [...new Set(projects.map((p) => p.user_id).filter(Boolean))] as string[];
        const users = await prisma.vf_users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, profile_image_url: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));

        const enrichedLikes = likes.map((like) => {
          const project = projects.find((p) => p.project_id === like.project_id);
          if (project) {
            const u = userMap.get(project.user_id || '');
            return {
              ...like,
              Project: {
                ...project,
                user: u ? { id: u.id, username: u.username || 'Unknown', profile_image_url: u.profile_image_url || '/globe.svg' } : null,
              },
            };
          }
          return like;
        });
        return NextResponse.json({ likes: enrichedLikes });
      }
      return NextResponse.json({ likes: likes || [] });
    } else if (projectId) {
      const count = await prisma.vf_likes.count({
        where: { project_id: Number(projectId) },
      });
      return NextResponse.json({ count });
    }
    return NextResponse.json({ error: '파라미터 필요' }, { status: 400 });
  } catch (error) {
    console.error('[Likes GET] Error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
