import { Suspense } from "react";
import prisma from "@/lib/db";
import HomeClient from "./HomeClient";

export const revalidate = 60;

async function getPageData() {
  try {
    const now = new Date();

    // projects + contests 병렬 fetch
    const [projectsRaw, contests] = await Promise.all([
      prisma.vf_projects.findMany({
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
          // JOIN: 작성자 정보 한번에
          vf_users: {
            select: {
              id: true,
              username: true,
              profile_image_url: true,
              expertise: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      prisma.vf_recruit_items.findMany({
        where: {
          is_active: true,
          is_approved: true,
          type: { in: ['contest', 'event'] },
          date: { gte: now.toISOString().split('T')[0] },
        },
        orderBy: { date: 'asc' },
        take: 10,
      }),
    ]);

    const projects = projectsRaw.map((p) => {
      const { vf_users, ...rest } = p;
      return {
        ...rest,
        users: vf_users
          ? {
              username: vf_users.username || 'Unknown',
              avatar_url: vf_users.profile_image_url || '/globe.svg',
              expertise: vf_users.expertise || null,
            }
          : { username: 'Unknown', avatar_url: '/globe.svg' },
      };
    });

    return { projects, contests };
  } catch (error) {
    console.error('[SSR] Failed to fetch page data:', error);
    return { projects: [], contests: [] };
  }
}

export default async function Home() {
  const { projects, contests } = await getPageData();

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeClient initialProjects={projects} initialContests={contests} />
    </Suspense>
  );
}
