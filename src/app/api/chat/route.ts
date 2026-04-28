import { NextRequest, NextResponse } from 'next/server';

const ZEROCLAW_URL = process.env.ZEROCLAW_WEBHOOK_URL || 'http://172.17.0.1:42634/webhook';
const ZEROCLAW_TOKEN = process.env.ZEROCLAW_TOKEN || '';

// Simple in-memory rate limit: 20 messages per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '메시지를 너무 많이 보내셨어요. 잠시 후 다시 시도해 주세요.' },
        { status: 429 }
      );
    }

    const { message, sessionId } = await req.json();
    if (!message || typeof message !== 'string' || message.length > 500) {
      return NextResponse.json(
        { error: '메시지가 올바르지 않아요.' },
        { status: 400 }
      );
    }

    if (!ZEROCLAW_TOKEN) {
      console.error('[chat] ZEROCLAW_TOKEN not configured');
      return NextResponse.json(
        { response: '챗봇 서비스를 준비 중이에요. 잠시 후 다시 시도해 주세요.' },
        { status: 200 }
      );
    }

    const res = await fetch(ZEROCLAW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEROCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        message,
        channel: 'web',
        session_id: sessionId,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error('[chat] ZeroClaw error:', res.status);
      return NextResponse.json(
        { response: 'AI 기능이 아직 원활하지 않을 수 있어요. 잠시 후 다시 시도해 주세요.' },
        { status: 200 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ response: data.response || '답변을 생성하지 못했어요.' });
  } catch (err: any) {
    console.error('[chat] error:', err?.message);
    return NextResponse.json(
      { response: 'AI 기능이 아직 원활하지 않을 수 있어요. 잠시 후 다시 시도해 주세요.' },
      { status: 200 }
    );
  }
}
