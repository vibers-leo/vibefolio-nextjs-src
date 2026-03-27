// src/app/api/follows/route.ts — Prisma
// NOTE: vf_ 테이블에 follows가 없으므로, 공통 follows 테이블 사용
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';

export async function POST(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const follower_id = authUser.id;
    const body = await request.json();
    const { following_id } = body;

    if (!following_id) {
      return NextResponse.json({ error: 'following_id 필수' }, { status: 400 });
    }
    if (follower_id === following_id) {
      return NextResponse.json({ error: '자기 자신을 팔로우할 수 없습니다.' }, { status: 400 });
    }

    // 기존 팔로우 확인
    const existing = await prisma.follows.findUnique({
      where: { follower_id_following_id: { follower_id, following_id } },
    });

    if (existing) {
      await prisma.follows.delete({
        where: { follower_id_following_id: { follower_id, following_id } },
      });
      return NextResponse.json({ following: false, message: '언팔로우' });
    } else {
      await prisma.follows.create({
        data: { follower_id, following_id },
      });
      return NextResponse.json({ following: true, message: '팔로우 완료' });
    }
  } catch (error) {
    console.error('[Follows] Error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const followerId = searchParams.get('followerId');
    const followingId = searchParams.get('followingId');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (followerId && followingId) {
      const data = await prisma.follows.findUnique({
        where: { follower_id_following_id: { follower_id: followerId, following_id: followingId } },
      });
      return NextResponse.json({ following: !!data });
    }

    if (userId && type) {
      if (type === 'followers') {
        const follows = await prisma.follows.findMany({
          where: { following_id: userId },
          orderBy: { created_at: 'desc' },
        });
        const count = follows.length;

        if (follows.length > 0) {
          const followerIds = follows.map((f) => f.follower_id);
          const profiles = await prisma.vf_users.findMany({
            where: { id: { in: followerIds } },
            select: { id: true, username: true, profile_image_url: true },
          });
          const profileMap = new Map(profiles.map((p) => [p.id, p]));

          const enriched = follows.map((follow) => {
            const profile = profileMap.get(follow.follower_id);
            return {
              ...follow,
              user: profile ? { id: profile.id, username: profile.username || 'Unknown', profile_image_url: profile.profile_image_url || '/globe.svg' } : null,
            };
          });
          return NextResponse.json({ followers: enriched, count });
        }
        return NextResponse.json({ followers: [], count: 0 });
      } else if (type === 'following') {
        const followingData = await prisma.follows.findMany({
          where: { follower_id: userId },
          orderBy: { created_at: 'desc' },
        });
        const count = followingData.length;

        if (followingData.length > 0) {
          const followingIds = followingData.map((f) => f.following_id);
          const profiles = await prisma.vf_users.findMany({
            where: { id: { in: followingIds } },
            select: { id: true, username: true, profile_image_url: true },
          });
          const profileMap = new Map(profiles.map((p) => [p.id, p]));

          const enriched = followingData.map((follow) => {
            const profile = profileMap.get(follow.following_id);
            return {
              ...follow,
              user: profile ? { id: profile.id, username: profile.username || 'Unknown', profile_image_url: profile.profile_image_url || '/globe.svg' } : null,
            };
          });
          return NextResponse.json({ following: enriched, count });
        }
        return NextResponse.json({ following: [], count: 0 });
      }
    }

    if (userId) {
      const [followersCount, followingCount] = await Promise.all([
        prisma.follows.count({ where: { following_id: userId } }),
        prisma.follows.count({ where: { follower_id: userId } }),
      ]);
      return NextResponse.json({ followersCount, followingCount });
    }
    return NextResponse.json({ error: '파라미터 필요' }, { status: 400 });
  } catch (error) {
    console.error('[Follows GET] Error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
