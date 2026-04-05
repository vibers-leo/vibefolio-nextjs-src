import { NextRequest, NextResponse } from 'next/server';
import { generateText, hasAIProvider } from '@/lib/ai/client';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/ai/rate-limit';

export async function POST(req: NextRequest) {
  if (!hasAIProvider()) {
    return NextResponse.json({ success: false, summary: null, error: 'API Key missing' });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const { allowed } = checkRateLimit(ip, false);
  if (!allowed) {
    return NextResponse.json({ success: false, summary: null, error: '오늘 AI 요약 이용 횟수를 초과했습니다.' }, { status: 429 });
  }

  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
    }

    const [comments, ratings] = await Promise.all([
      prisma.vf_comments.findMany({
        where: { project_id: projectId, is_deleted: false, is_secret: false },
        select: { content: true },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      prisma.evaluations.findMany({
        where: { project_id: projectId },
        select: { score_1: true, score_2: true, score_3: true, score_4: true, proposal: true },
      }),
    ]);

    const commentCount = comments.length;
    const ratingCount = ratings.length;

    if (commentCount < 2 && ratingCount < 1) {
      return NextResponse.json({ success: true, summary: null, reason: 'insufficient_data' });
    }

    let avgScores = '';
    if (ratingCount > 0) {
      const avg = (key: keyof typeof ratings[0]) => {
        const sum = ratings.reduce((s: number, r: any) => s + (r[key] || 0), 0);
        return (sum / ratingCount).toFixed(1);
      };
      avgScores = `\n[평점 평균 5.0만점] 기획력: ${avg('score_1')}, 완성도: ${avg('score_2')}, 독창성: ${avg('score_3')}, 상업성: ${avg('score_4')}`;
    }

    const proposals = ratings.filter((r: any) => r.proposal?.trim()).map((r: any) => r.proposal.trim());
    const commentLines = comments.map((c) => `- ${c.content}`).join('\n') || '(없음)';
    const proposalLines = proposals.length > 0 ? proposals.map((p: string) => `- ${p}`).join('\n') : '(없음)';

    const prompt = `[댓글 ${commentCount}개]\n${commentLines}${avgScores}\n[제안 ${proposals.length}개]\n${proposalLines}`;

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
