import { NextRequest, NextResponse } from 'next/server';
import { generateText, hasAIProvider } from '@/lib/ai/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/ai/rate-limit';

export async function POST(req: NextRequest) {
  if (!hasAIProvider()) {
    return NextResponse.json({ success: false, summary: null, error: 'API Key missing' });
  }

  // Rate Limit (IP 기반)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const { allowed } = checkRateLimit(ip, false);
  if (!allowed) {
    return NextResponse.json({
      success: false,
      summary: null,
      error: '오늘 AI 요약 이용 횟수를 초과했습니다.',
    }, { status: 429 });
  }

  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
    }

    const { data: comments } = await supabaseAdmin
      .from('Comment')
      .select('content')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .eq('is_secret', false)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: ratings } = await supabaseAdmin
      .from('ProjectRating')
      .select('score_1, score_2, score_3, score_4, proposal')
      .eq('project_id', projectId);

    const commentCount = comments?.length || 0;
    const ratingCount = ratings?.length || 0;

    if (commentCount < 2 && ratingCount < 1) {
      return NextResponse.json({ success: true, summary: null, reason: 'insufficient_data' });
    }

    let avgScores = '';
    if (ratingCount > 0) {
      const avg = (key: string) => {
        const sum = ratings!.reduce((s, r) => s + (r[key] || 0), 0);
        return (sum / ratingCount).toFixed(1);
      };
      avgScores = `\n[평점 평균 5.0만점] 기획력: ${avg('score_1')}, 완성도: ${avg('score_2')}, 독창성: ${avg('score_3')}, 상업성: ${avg('score_4')}`;
    }

    const proposals = ratings
      ?.filter((r) => r.proposal && r.proposal.trim())
      .map((r) => r.proposal.trim()) || [];

    const commentLines = comments?.map((c) => `- ${c.content}`).join('\n') || '(없음)';
    const proposalLines = proposals.length > 0
      ? proposals.map((p) => `- ${p}`).join('\n')
      : '(없음)';

    const prompt = `[댓글 ${commentCount}개]
${commentLines}
${avgScores}
[제안 ${proposals.length}개]
${proposalLines}`;

    const text = await generateText({
      systemPrompt: '피드백을 분석하여 핵심을 요약하세요. 반드시 3줄, "• "로 시작, 각 40자 이내, 한국어, 존댓말, 줄 외 텍스트 금지.',
      prompt,
      maxTokens: 256,
      timeout: 15000,
    });

    return NextResponse.json({ success: true, summary: text.trim() });
  } catch (error: any) {
    console.error('[AI Feedback Summary]', error);
    return NextResponse.json({ success: false, summary: null, error: error.message });
  }
}
