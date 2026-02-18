/**
 * Expo Push Notification 전송 모듈
 *
 * 알림 생성 시 대상 유저의 모바일 앱에 푸시 알림을 전송한다.
 * Expo Push API (https://exp.host/--/api/v2/push/send) 사용.
 *
 * [주의] 이 모듈은 서버 사이드(API Routes)에서만 사용할 것.
 * supabaseAdmin을 사용하므로 클라이언트에서 import하면 안 됨.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

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
 * push_tokens 테이블에서 유저의 모든 디바이스 토큰을 조회하고 전송
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
    // 유저의 푸시 토큰 조회
    const { data: tokens, error } = await supabaseAdmin
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', userId);

    if (error || !tokens || tokens.length === 0) {
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

    const result = await sendExpoPush(messages);
    return result;
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
    const { data: tokens, error } = await supabaseAdmin
      .from('push_tokens')
      .select('expo_push_token')
      .in('user_id', userIds);

    if (error || !tokens || tokens.length === 0) {
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

/**
 * Expo Push API 직접 호출
 * 최대 100개씩 배치 전송 (Expo 제한)
 */
async function sendExpoPush(
  messages: PushMessage[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Expo는 한 번에 최대 100개 메시지
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
          // DeviceNotRegistered → 토큰 삭제
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

/**
 * 유효하지 않은 토큰 자동 정리
 */
async function cleanupInvalidToken(token: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('push_tokens')
      .delete()
      .eq('expo_push_token', token);
    console.log('[Push] Cleaned up invalid token:', token.slice(0, 20) + '...');
  } catch (e) {
    console.error('[Push] Token cleanup failed:', e);
  }
}
