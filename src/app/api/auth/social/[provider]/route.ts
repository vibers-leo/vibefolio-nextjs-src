export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/auth/validate';
import prisma from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const authUser = await validateUser(req);
  if (!authUser) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  const { provider } = await params;
  if (!['google', 'kakao', 'naver'].includes(provider))
    return NextResponse.json({ error: '지원하지 않는 제공자입니다.' }, { status: 400 });

  const profile = await prisma.vf_users.findUnique({ where: { id: authUser.id } });
  if (!profile) return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });

  const connectedCount = [profile.google_id, profile.kakao_id, profile.naver_id].filter(Boolean).length;
  if (connectedCount <= 1 && !profile.password_hash)
    return NextResponse.json({ error: '비밀번호를 먼저 설정해야 소셜 연동을 해제할 수 있습니다.' }, { status: 400 });

  const field = `${provider}_id` as 'google_id' | 'kakao_id' | 'naver_id';
  await prisma.vf_users.update({ where: { id: authUser.id }, data: { [field]: null } });

  return NextResponse.json({ success: true });
}
