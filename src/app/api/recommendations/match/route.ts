import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/auth/admins';
import { matchAndNotify } from '@/lib/recommendations/matchInterests';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  // 관리자 인증 확인
  const authHeader = request.headers.get('authorization');
  const { data: { user } } = await supabaseAdmin.auth.getUser(
    authHeader?.replace('Bearer ', '') || ''
  );

  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { approvedItemIds } = await request.json();

    if (!Array.isArray(approvedItemIds) || approvedItemIds.length === 0) {
      return NextResponse.json({ success: true, matched: 0, notified: 0 });
    }

    const result = await matchAndNotify(approvedItemIds);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Recommendations Match API]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
