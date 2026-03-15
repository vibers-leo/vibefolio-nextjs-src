import { NextRequest, NextResponse } from 'next/server';
import { model } from '@/lib/ai/client';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({
      success: false,
      analysis: "AI 서비스가 현재 점검 중입니다. 이용에 불편을 드려 죄송합니다.",
    }, { status: 200 });
  }

  // Rate Limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { allowed, remaining } = checkRateLimit(user?.id || ip, !!user);
  if (!allowed) {
    return NextResponse.json({
      success: false,
      analysis: "오늘 AI 분석 이용 횟수를 초과했습니다. 내일 다시 이용해주세요.",
    }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { scores, projectTitle, category } = body;

    if (!scores) {
      return NextResponse.json({ success: false, error: 'Scores are required' }, { status: 400 });
    }

    const { score_1, score_2, score_3, score_4 } = scores;

    const prompt = `당신은 'Vibefolio Michelin'이라는 예술/디자인 평가 시스템의 수석 인스펙터입니다.
아래 평가 데이터를 바탕으로 창작자에게 전하는 한 줄의 통찰과 조언을 작성해주세요.

[프로젝트] ${projectTitle || '제목 미상'} (${category || '일반'})
[점수 5.0만점] 기획력: ${score_1}, 완성도: ${score_2}, 독창성: ${score_3}, 상업성: ${score_4}

규칙: 존댓말, 1~2문장, 150자 이내, 날카롭고 정중한 전문가 어조`;

    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 15000)
        ),
      ]);

      const text = result.response.text();
      return NextResponse.json({ success: true, analysis: text, remaining });
    } catch (apiError: any) {
      return NextResponse.json({
        success: false,
        analysis: "데이터를 분석하는 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error('[AI Analysis Route Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
