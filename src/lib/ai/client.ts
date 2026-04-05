import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ===== Provider Setup =====
const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Groq (primary) — llama-3.3-70b-versatile, 무료 tier 포함
export const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

// Gemini (fallback) — gemini-2.0-flash
export const genAI = new GoogleGenerativeAI(GEMINI_KEY || '');

/** AI 제공자가 하나라도 설정되어 있는지 확인 */
export function hasAIProvider(): boolean {
  return !!(GROQ_KEY || GEMINI_KEY);
}

// ===== Unified Text Generation =====
interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  jsonMode?: boolean;
  temperature?: number;
  timeout?: number;
}

/**
 * 통합 텍스트 생성. Groq 우선, 실패 시 Gemini 폴백.
 * 이미지 생성은 Gemini 전용이므로 이 함수 범위 밖.
 */
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const {
    prompt,
    systemPrompt,
    maxTokens = 1024,
    jsonMode = false,
    temperature = 0.7,
    timeout = 15000,
  } = options;

  // ── Groq (primary) ──
  if (groq) {
    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const completion = await Promise.race([
        groq.chat.completions.create({
          messages,
          model: 'llama-3.3-70b-versatile',
          temperature,
          max_tokens: maxTokens,
          ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Groq timeout')), timeout)
        ),
      ]);

      const text = completion.choices[0]?.message?.content || '';
      if (text) return text;
    } catch (err) {
      console.warn('[AI] Groq failed, falling back to Gemini:', (err as Error).message);
    }
  }

  // ── Gemini (fallback) ──
  if (GEMINI_KEY) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: maxTokens },
    });

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    const result = await Promise.race([
      model.generateContent(fullPrompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), timeout)
      ),
    ]);

    return result.response?.text()?.trim() || '';
  }

  throw new Error('No AI provider available');
}
