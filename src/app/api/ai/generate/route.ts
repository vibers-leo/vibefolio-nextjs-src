import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { createClient } from "@/lib/supabase/server";

// edge runtime 제거 — 인메모리 Rate Limit Map과 호환 안 됨

export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({
      error: "AI 서비스 점검 중",
      message: "현재 AI 서비스 점검 중입니다."
    }, { status: 200 });
  }

  // Rate Limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { allowed } = checkRateLimit(user?.id || ip, !!user);
  if (!allowed) {
    return NextResponse.json({
      error: "오늘 AI 생성 이용 횟수를 초과했습니다. 내일 다시 이용해주세요.",
    }, { status: 429 });
  }

  try {
    const { type, topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 1024 },
    });

    let prompt = "";

    if (type === 'lean-canvas') {
      prompt = `You are a Startup Consultant. Generate a Lean Canvas for: "${topic}"
Language: Korean. Output: JSON only, no markdown code blocks.
{"problem":"3 key problems","customerSegments":"Target customers","uniqueValueProposition":"Why different","solution":"Top 3 features","channels":"Path to customers","revenueStreams":"Revenue model","costStructure":"Costs","keyMetrics":"Key metrics","unfairAdvantage":"Cannot be copied"}
Start JSON:`;
    } else if (type === 'persona') {
      prompt = `You are a UX Researcher. Define a target persona for: "${topic}"
Language: Korean. Output: JSON only, no markdown code blocks.
{"name":"Korean Name","age":"e.g. 28세","job":"Job","location":"City","quote":"Pain point quote","bio":"2-3 sentences","goals":[".."],"frustrations":[".."],"brands":[".."],"mbti":"Type","imageKeyword":"english keyword for avatar"}
Start JSON:`;
    } else if (type === 'assistant') {
      prompt = `You are a Content Writing Assistant. Write a draft for: "${topic}"
Language: Korean. Output: JSON only, no markdown code blocks.
{"title":"Title","content":"Full markdown content with headers and bullet points"}
Start JSON:`;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      ),
    ]);

    let text = result.response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const json = JSON.parse(text);

      if (type === 'persona' && json.imageKeyword) {
        json.image = `https://api.dicebear.com/7.x/avataaars/svg?seed=${json.name}&backgroundColor=b6e3f4`;
      }

      return NextResponse.json(json);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
