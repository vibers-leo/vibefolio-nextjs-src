import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase/admin';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({
      success: false,
      summary: null,
      error: 'API Key missing',
    });
  }

  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
    }

    // 1. 코멘트 조회 (삭제되지 않은 공개 코멘트만)
    const { data: comments } = await supabaseAdmin
      .from('Comment')
      .select('content')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .eq('is_secret', false)
      .order('created_at', { ascending: false })
      .limit(20);

    // 2. 평점 조회 (proposal 텍스트 포함)
    const { data: ratings } = await supabaseAdmin
      .from('ProjectRating')
      .select('score_1, score_2, score_3, score_4, proposal')
      .eq('project_id', projectId);

    const commentCount = comments?.length || 0;
    const ratingCount = ratings?.length || 0;

    // 최소 조건: 코멘트 2개 이상 OR 평점 1개 이상
    if (commentCount < 2 && ratingCount < 1) {
      return NextResponse.json({ success: true, summary: null, reason: 'insufficient_data' });
    }

    // 3. 평균 점수 계산
    let avgScores = '';
    if (ratingCount > 0) {
      const avg = (key: string) => {
        const sum = ratings!.reduce((s, r) => s + (r[key] || 0), 0);
        return (sum / ratingCount).toFixed(1);
      };
      avgScores = `\n[평점 평균 (5.0 만점)] 기획력: ${avg('score_1')}, 완성도: ${avg('score_2')}, 독창성: ${avg('score_3')}, 상업성: ${avg('score_4')}`;
    }

    // 4. proposal 텍스트 수집
    const proposals = ratings
      ?.filter((r) => r.proposal && r.proposal.trim())
      .map((r) => r.proposal.trim()) || [];

    // 5. 프롬프트 구성
    const commentLines = comments?.map((c) => `- ${c.content}`).join('\n') || '(없음)';
    const proposalLines = proposals.length > 0
      ? proposals.map((p) => `- ${p}`).join('\n')
      : '(없음)';

    const prompt = `이 크리에이티브 프로젝트에 대한 피드백을 분석하여 핵심 테마를 요약하세요.

[댓글 ${commentCount}개]
${commentLines}
${avgScores}
[평가 제안 ${proposals.length}개]
${proposalLines}

규칙:
- 반드시 3줄, 각 줄은 "• " 로 시작
- 각 줄 40자 이내, 한국어
- 구체적이고 건설적인 내용만
- 존댓말 사용
- 줄 외에 다른 텍스트 금지`;

    // 6. Gemini 호출 (8초 타임아웃)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 8000)
      ),
    ]);

    const text = result.response.text().trim();

    return NextResponse.json({ success: true, summary: text });
  } catch (error: any) {
    console.error('[AI Feedback Summary]', error);
    return NextResponse.json({
      success: false,
      summary: null,
      error: error.message,
    });
  }
}
