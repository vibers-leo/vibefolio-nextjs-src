/**
 * POST /api/notifications — 알림 생성 + 모바일 푸시 전송
 *
 * 클라이언트(웹/앱)에서 알림을 생성할 때 이 API를 호출하면:
 * 1. notifications 테이블에 INSERT
 * 2. 대상 유저의 push_tokens 조회 → Expo Push API로 전송
 *
 * Body: { userId, type, title, message, link?, senderId?, actionLabel?, actionUrl? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/push';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, title, message, link, senderId, actionLabel, actionUrl } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'userId, type, title, message are required' },
        { status: 400 }
      );
    }

    // 1. DB에 알림 저장
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link: link || null,
        sender_id: senderId || null,
        action_label: actionLabel || null,
        action_url: actionUrl || null,
        read: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Notifications API] Insert failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. 모바일 푸시 전송 (비동기, 실패해도 알림 생성은 성공)
    const pushData: Record<string, string> = {};
    if (link) pushData.url = link;

    // link에서 projectId, recruitId 추출
    if (link?.startsWith('/project/')) {
      const id = link.split('/project/')[1]?.split('?')[0];
      if (id) pushData.projectId = id;
    } else if (link?.startsWith('/recruit/')) {
      const id = link.split('/recruit/')[1]?.split('?')[0];
      if (id) pushData.recruitId = id;
    }

    sendPushToUser({
      userId,
      title: title.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim(), // 이모지 제거 (푸시에서 깨질 수 있음)
      body: message,
      data: Object.keys(pushData).length > 0 ? pushData : undefined,
    }).catch((e) => {
      console.error('[Notifications API] Push send failed (non-blocking):', e);
    });

    return NextResponse.json({
      success: true,
      notificationId: notification?.id,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Notifications API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/notifications — 유저의 알림 목록 조회
 * Query: ?limit=50&offset=0
 */
export async function GET(req: NextRequest) {
  try {
    // Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: notifications || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/notifications — 알림 읽음 처리
 * Body: { notificationId: string } 또는 { markAllRead: true }
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();

    if (body.markAllRead) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (body.notificationId) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', body.notificationId)
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'notificationId or markAllRead required' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
