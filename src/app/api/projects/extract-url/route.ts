import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { uploadImageFromUrl } from '@/lib/supabase/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. 페이지 크롤링 (cheerio + OG 태그)
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      maxRedirects: 3,
    });

    const $ = cheerio.load(response.data);

    // 2. 메타데이터 추출
    const title = (
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      ''
    ).trim();

    const description = (
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      ''
    ).trim();

    const ogImage = (
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:url"]').attr('content') ||
      ''
    ).trim();

    const siteName = (
      $('meta[property="og:site_name"]').attr('content') ||
      ''
    ).trim();

    const keywords = (
      $('meta[name="keywords"]').attr('content') ||
      ''
    ).trim();

    // 3. OG 이미지를 Supabase에 아카이브
    let thumbnailUrl = ogImage;
    if (ogImage && ogImage.startsWith('http')) {
      try {
        thumbnailUrl = await uploadImageFromUrl(ogImage, 'projects');
      } catch {
        // 아카이브 실패 시 원본 URL 유지
        console.warn('[extract-url] Image archive failed, using original URL');
      }
    }

    // 4. Gemini AI로 소개글 초안 생성
    let aiDescription = '';
    if (GEMINI_API_KEY && (title || description)) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `당신은 크리에이터 포트폴리오 플랫폼의 AI 어시스턴트입니다.
아래 웹서비스/프로젝트 정보를 바탕으로, 이 프로젝트를 소개하는 매력적인 게시글 본문을 작성해주세요.

프로젝트명: ${title}
사이트: ${siteName || new URL(url).hostname}
설명: ${description || '(설명 없음)'}
키워드: ${keywords || '(없음)'}

작성 규칙:
- 3~5문장으로 간결하게
- 이 프로젝트가 어떤 문제를 해결하고, 어떤 가치를 제공하는지 중심으로
- 기술적 특징이 있으면 자연스럽게 언급
- 친근하되 전문적인 톤
- 마크다운 사용하지 않기 (순수 텍스트)
- "이 프로젝트는~" 같은 딱딱한 시작 대신 자연스럽게 시작`;

        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI timeout')), 10000)
          ),
        ]);

        aiDescription = result.response?.text()?.trim() || '';
      } catch (err) {
        console.warn('[extract-url] AI description generation failed:', err);
        // AI 실패 시 빈 문자열 유지 — 사용자가 직접 작성
      }
    }

    return NextResponse.json({
      success: true,
      title,
      description,
      aiDescription,
      thumbnailUrl,
      sourceUrl: url,
      siteName: siteName || new URL(url).hostname,
      keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
    });
  } catch (error: any) {
    console.error('[extract-url] Error:', error?.message);

    // 일반적인 크롤링 실패 (403, timeout 등)
    if (error?.code === 'ECONNABORTED' || error?.response?.status === 403) {
      return NextResponse.json(
        { error: '해당 사이트에 접근할 수 없습니다. URL을 확인해주세요.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'URL 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
