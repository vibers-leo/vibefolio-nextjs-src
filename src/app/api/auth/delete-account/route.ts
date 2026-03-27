// src/app/api/auth/delete-account/route.ts
// 회원탈퇴 API — Prisma

import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/auth/validate';
import prisma from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = authUser.id;
    console.log(`[Delete Account] Starting deletion for user: ${userId}`);

    // vf_ 테이블에서 관련 데이터 삭제 (외래키 제약 고려)
    await Promise.allSettled([
      prisma.vf_comments.deleteMany({ where: { user_id: userId } }),
      prisma.vf_likes.deleteMany({ where: { user_id: userId } }),
      prisma.vf_wishlists.deleteMany({ where: { user_id: userId } }),
      prisma.vf_notifications.deleteMany({ where: { user_id: userId } }),
      prisma.vf_notifications.deleteMany({ where: { sender_id: userId } }),
      prisma.vf_push_tokens.deleteMany({ where: { user_id: userId } }),
      prisma.vf_proposals.deleteMany({ where: { user_id: userId } }),
    ]);

    // 프로젝트 삭제
    await prisma.vf_projects.deleteMany({ where: { user_id: userId } });

    // 유저 삭제
    await prisma.vf_users.delete({ where: { id: userId } });

    console.log(`[Delete Account] Successfully deleted user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: '계정이 성공적으로 삭제되었습니다.',
    });
  } catch (error) {
    console.error('[Delete Account] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
