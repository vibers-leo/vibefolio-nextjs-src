import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  console.warn("GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

// gemini-2.0-flash: 무료 티어 포함, 비용 절감 (2026-03-15 다운그레이드)
export const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: { maxOutputTokens: 1024 },
});

export const shortModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: { maxOutputTokens: 512 },
});
