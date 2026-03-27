// src/app/api/comments/route.ts — Prisma
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId가 필요합니다.' }, { status: 400 });
    }

    const authUser = await validateUser(request);
    const currentUserId = authUser?.id || null;

    // 프로젝트 소유자 조회
    const projectInfo = await prisma.vf_projects.findUnique({
      where: { project_id: Number(projectId) },
      select: { user_id: true },
    });
    const projectOwnerId = projectInfo?.user_id;

    const data = await prisma.vf_comments.findMany({
      where: { project_id: Number(projectId), is_deleted: false },
      orderBy: { created_at: 'desc' },
    });

    // 비밀 댓글 필터링
    const filteredData = data.map((comment: any) => {
      if (comment.is_secret) {
        const isAuthor = currentUserId && comment.user_id === currentUserId;
        const isProjectOwner = currentUserId && projectOwnerId === currentUserId;
        if (!isAuthor && !isProjectOwner) {
          return { ...comment, content: '비밀 댓글입니다.' };
        }
      }
      return comment;
    });

    // 유저 정보 보강
    if (filteredData.length > 0) {
      const userIds = [...new Set(filteredData.map((c) => c.user_id).filter(Boolean))] as string[];
      const users = await prisma.vf_users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, nickname: true, profile_image_url: true },
      });
      const userMap = new Map(users.map((u) => [u.id, { username: u.username || u.nickname || 'Unknown', profile_image_url: u.profile_image_url || '/globe.svg' }]));

      // 대댓글 구조 구성
      const commentMap = new Map();
      const rootComments: any[] = [];

      filteredData.forEach((comment: any) => {
        comment.user = userMap.get(comment.user_id) || { username: 'Unknown', profile_image_url: '/globe.svg' };
        comment.replies = [];
        commentMap.set(comment.comment_id, comment);
      });

      filteredData.forEach((comment: any) => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) parent.replies.push(comment);
        } else {
          rootComments.push(comment);
        }
      });
      return NextResponse.json({ comments: rootComments });
    }

    return NextResponse.json({ comments: filteredData });
  } catch (error) {
    console.error('[Comments GET] Error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, project_id, content, parentCommentId, mentionedUserId, isSecret, locationX, locationY } = body;
    const targetProjectId = Number(projectId || project_id);

    if (!targetProjectId || !content) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 });
    }

    const comment = await prisma.vf_comments.create({
      data: {
        user_id: authUser.id,
        project_id: targetProjectId,
        content,
        parent_comment_id: parentCommentId ? Number(parentCommentId) : null,
        is_secret: isSecret || false,
      },
    });

    // 유저 정보 첨부
    const userInfo = await prisma.vf_users.findUnique({
      where: { id: authUser.id },
      select: { username: true, nickname: true, profile_image_url: true },
    });

    const result = comment as any;
    result.user = {
      username: userInfo?.username || userInfo?.nickname || 'Unknown',
      profile_image_url: userInfo?.profile_image_url || '/globe.svg',
    };

    return NextResponse.json({ message: '댓글 작성 완료', comment: result }, { status: 201 });
  } catch (error) {
    console.error('[Comments POST] Error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('commentId');
    if (!commentId) return NextResponse.json({ error: 'commentId 필요' }, { status: 400 });

    const authUser = await validateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const comment = await prisma.vf_comments.findUnique({
      where: { comment_id: Number(commentId) },
      select: { user_id: true },
    });
    if (!comment) return NextResponse.json({ error: '댓글 없음' }, { status: 404 });
    if (comment.user_id !== authUser.id) {
      return NextResponse.json({ error: '삭제 권한 없음' }, { status: 403 });
    }

    await prisma.vf_comments.update({
      where: { comment_id: Number(commentId) },
      data: { is_deleted: true },
    });

    return NextResponse.json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
