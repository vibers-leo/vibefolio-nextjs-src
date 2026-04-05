import { NextRequest, NextResponse } from "next/server";
import { validateUser } from "@/lib/auth/validate";
import { processUserQuery } from "@/lib/ai/search-service";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { hasAIProvider } from "@/lib/ai/client";

export async function POST(req: NextRequest) {
  if (!hasAIProvider()) {
    return NextResponse.json({
      error: "AI 서비스 점검 중",
      answer: "현재 AI 서비스 안정화를 위해 점검 중입니다.",
      results: []
    }, { status: 200 });
  }

  try {
    const user = await validateUser(req);

    // Rate Limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { allowed } = checkRateLimit(user?.id || ip, !!user);
    if (!allowed) {
      return NextResponse.json({
        answer: "오늘 AI 채팅 이용 횟수를 초과했습니다. 내일 다시 이용해주세요.",
        results: []
      }, { status: 429 });
    }

    const body = await req.json();
    const { message, category, sessionId } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const agentResponse = await processUserQuery(message, category);

    let currentSessionId = sessionId;

    // ai_chat_sessions / ai_chat_messages 테이블은 미구현 — 세션 저장 스킵

    return NextResponse.json({
      sessionId: currentSessionId,
      answer: agentResponse.answer,
      results: agentResponse.results
    });

  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
