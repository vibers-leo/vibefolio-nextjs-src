/**
 * Expo Push Notification 전송 모듈 — Prisma
 */

import prisma from '@/lib/db';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface PushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * 특정 유저에게 푸시 알림 전송
 */
export async function sendPushToUser({
  userId,
  title,
  body,
  data,
}: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ sent: number; failed: number }> {
  try {
    const tokens = await prisma.vf_push_tokens.findMany({
      where: { user_id: userId },
      select: { expo_push_token: true },
    });

    if (!tokens || tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title,
      body,
      data,
      sound: 'default' as const,
      channelId: 'default',
    }));

    return await sendExpoPush(messages);
  } catch (e) {
    console.error('[Push] sendPushToUser failed:', e);
    return { sent: 0, failed: 0 };
  }
}

/**
 * 여러 유저에게 푸시 알림 일괄 전송
 */
export async function sendPushToUsers({
  userIds,
  title,
  body,
  data,
}: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ sent: number; failed: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  try {
    const tokens = await prisma.vf_push_tokens.findMany({
      where: { user_id: { in: userIds } },
      select: { expo_push_token: true },
    });

    if (!tokens || tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title,
      body,
      data,
      sound: 'default' as const,
      channelId: 'default',
    }));

    return await sendExpoPush(messages);
  } catch (e) {
    console.error('[Push] sendPushToUsers failed:', e);
    return { sent: 0, failed: 0 };
  }
}

async function sendExpoPush(messages: PushMessage[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const BATCH_SIZE = 100;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        console.error('[Push] Expo API error:', res.status, await res.text());
        failed += batch.length;
        continue;
      }

      const result = await res.json();
      const tickets: PushTicket[] = result.data || [];

      for (const ticket of tickets) {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          if (ticket.details?.error === 'DeviceNotRegistered') {
            const badToken = batch[tickets.indexOf(ticket)]?.to;
            if (badToken) {
              await cleanupInvalidToken(badToken);
            }
          }
        }
      }
    } catch (e) {
      console.error('[Push] Batch send failed:', e);
      failed += batch.length;
    }
  }

  return { sent, failed };
}

async function cleanupInvalidToken(token: string): Promise<void> {
  try {
    await prisma.vf_push_tokens.deleteMany({
      where: { expo_push_token: token },
    });
    console.log('[Push] Cleaned up invalid token:', token.slice(0, 20) + '...');
  } catch (e) {
    console.error('[Push] Token cleanup failed:', e);
  }
}
