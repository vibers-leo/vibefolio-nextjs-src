export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/auth/validate';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const authUser = await validateUser(req);
  if (!authUser) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!newPassword || newPassword.length < 6)
    return NextResponse.json({ error: '새 비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });

  const profile = await prisma.vf_users.findUnique({ where: { id: authUser.id } });
  if (!profile) return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });

  if (profile.password_hash && currentPassword) {
    const valid = await bcrypt.compare(currentPassword, profile.password_hash);
    if (!valid) return NextResponse.json({ error: '현재 비밀번호가 틀렸습니다.' }, { status: 400 });
  } else if (profile.password_hash && !currentPassword) {
    return NextResponse.json({ error: '현재 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.vf_users.update({ where: { id: authUser.id }, data: { password_hash: hash } });

  return NextResponse.json({ success: true });
}
