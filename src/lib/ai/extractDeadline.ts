import { generateText, hasAIProvider } from './client';

/**
 * LLM으로 마감일 추출. 실패 시 null 반환 (graceful degradation).
 */
export async function llmExtractDeadline(
  title: string,
  description: string
): Promise<string | null> {
  if (!hasAIProvider()) return null;

  const today = new Date().toISOString().split('T')[0];
  const prompt = `오늘 날짜는 ${today}입니다.
아래 공모전/채용 공고의 제목과 설명에서 접수/지원 마감일을 추출하세요.
반드시 YYYY-MM-DD 형식으로만 응답하세요. 마감일을 찾을 수 없으면 "null"이라고만 응답하세요.
다른 설명이나 텍스트는 절대 포함하지 마세요.

제목: ${title}
설명: ${description.substring(0, 500)}`;

  try {
    const text = await generateText({
      prompt,
      maxTokens: 64,
      temperature: 0.1,
      timeout: 5000,
    });

    const trimmed = text.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    return null;
  } catch (err) {
    console.warn('[LLM Deadline] Failed:', (err as Error).message);
    return null;
  }
}

interface ItemWithDate {
  title: string;
  description: string;
  date: string;
}

/**
 * 배치 마감일 추출. concurrency 3으로 제한.
 * 원본 배열의 date 필드를 직접 업데이트.
 */
export async function batchExtractDeadlines(items: ItemWithDate[]): Promise<number> {
  const needsExtraction = items.filter(
    (item) => !item.date || item.date === '확인 필요'
  );

  if (needsExtraction.length === 0) return 0;

  let extracted = 0;
  const CONCURRENCY = 3;

  for (let i = 0; i < needsExtraction.length; i += CONCURRENCY) {
    const batch = needsExtraction.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((item) => llmExtractDeadline(item.title, item.description))
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        batch[idx].date = result.value;
        extracted++;
      }
    });
  }

  console.log(`[LLM Deadline] Extracted ${extracted}/${needsExtraction.length} dates`);
  return extracted;
}
