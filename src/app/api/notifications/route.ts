// src/app/api/notifications/route.ts — Prisma
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth/validate';
import { sendPushToUser } from '@/lib/push';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, title, message, link, senderId, actionLabel, actionUrl } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: 'userId, type, title, message are required' }, { status: 400 });
    }

    const notification = await prisma.vf_notifications.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        link: link || null,
        sender_id: senderId || null,
        action_label: actionLabel || null,
        action_url: actionUrl || null,
        read: false,
      },
    });

    // 모바일 푸시 (비동기, 실패해도 OK)
    const pushData: Record<string, string> = {};
    if (link) pushData.url = link;

    sendPushToUser({
      userId,
      title: title.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim(),
      body: message,
      data: Object.keys(pushData).length > 0 ? pushData : undefined,
    }).catch((e) => {
      console.error('[Notifications API] Push send failed (non-blocking):', e);
    });

    return NextResponse.json({ success: true, notificationId: notification.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Notifications API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await validateUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const notifications = await prisma.vf_notifications.findMany({
      where: { user_id: authUser.id },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({ notifications: notifications || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await validateUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (body.markAllRead) {
      await prisma.vf_notifications.updateMany({
        where: { user_id: authUser.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (body.notificationId) {
      await prisma.vf_notifications.updateMany({
        where: { id: body.notificationId, user_id: authUser.id },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'notificationId or markAllRead required' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
