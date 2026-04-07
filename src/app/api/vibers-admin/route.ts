import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function verifyAdminSecret(request: Request): boolean {
  const secret = process.env.VIBERS_ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get('x-vibers-admin-secret') === secret;
}

export async function GET(request: Request) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, recentSignups, projectCount] = await Promise.all([
      prisma.vf_users.count(),
      prisma.vf_users.count({
        where: { created_at: { gte: thirtyDaysAgo } },
      }),
      prisma.vf_projects.count(),
    ]);

    // MAU: 최근 30일 내 프로젝트 활동 유저
    const mauResult = await prisma.vf_projects.findMany({
      where: { updated_at: { gte: thirtyDaysAgo } },
      select: { user_id: true },
      distinct: ['user_id'],
    });
    const mau = mauResult.length;

    return NextResponse.json({
      projectId: 'vibefolio-nextjs',
      projectName: 'Vibefolio',
      stats: {
        totalUsers,
        mau,
        contentCount: projectCount,
        recentSignups,
      },
      recentActivity: [],
      health: 'healthy',
    });
  } catch {
    return NextResponse.json({
      projectId: 'vibefolio-nextjs',
      projectName: 'Vibefolio',
      stats: { mau: 0, totalUsers: 0, contentCount: 0, recentSignups: 0 },
      recentActivity: [],
      health: 'error',
    });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
