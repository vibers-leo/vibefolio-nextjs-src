import { Suspense } from "react";
import prisma from "@/lib/db";
import HomeClient from "./HomeClient";

// 서버에서 초기 프로젝트 데이터를 미리 가져옴 (SSR)
export const revalidate = 60; // 1분마다 재검증

async function getInitialProjects() {
  try {
    const now = new Date();

    const projects = await prisma.vf_projects.findMany({
      where: {
        deleted_at: null,
        visibility: 'public',
        OR: [
          { scheduled_at: null },
          { scheduled_at: { lte: now } },
        ],
      },
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
        custom_data: true,
        allow_michelin_rating: true,
        allow_stickers: true,
        allow_secret_comments: true,
        visibility: true,
        scheduled_at: true,
        audit_deadline: true,
        is_feedback_requested: true,
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    if (projects.length > 0) {
      // 작성자 정보 병합
      const userIds = [...new Set(projects.map((p) => p.user_id).filter(Boolean))] as string[];

      if (userIds.length > 0) {
        const users = await prisma.vf_users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, profile_image_url: true, expertise: true },
        });

        const userMap = new Map(users.map((u) => [
          u.id,
          {
            username: u.username || 'Unknown',
            avatar_url: u.profile_image_url || '/globe.svg',
            expertise: u.expertise || null,
          },
        ]));

        return projects.map((project) => ({
          ...project,
          users: userMap.get(project.user_id ?? '') || { username: 'Unknown', avatar_url: '/globe.svg' },
        }));
      }
    }

    return projects;
  } catch (error) {
    console.error('[SSR] Failed to fetch initial projects:', error);
    return [];
  }
}

export default async function Home() {
  // 서버에서 초기 데이터 가져오기
  const initialProjects = await getInitialProjects();

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeClient initialProjects={initialProjects} />
    </Suspense>
  );
}
