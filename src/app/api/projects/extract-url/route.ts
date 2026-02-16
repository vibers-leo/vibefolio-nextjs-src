import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { uploadImageFromUrl } from '@/lib/supabase/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// ==================== Deep Content Extraction ====================
function extractPageContent($: cheerio.CheerioAPI): string {
  const parts: string[] = [];

  // Headings (h1-h6)
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) {
      parts.push(text);
    }
  });

  // First ~10 paragraphs
  let pCount = 0;
  $('p').each((_, el) => {
    if (pCount >= 10) return false;
    const text = $(el).text().trim();
    if (text && text.length > 20 && text.length < 500) {
      parts.push(text);
      pCount++;
    }
  });

  // List items (first 20)
  let liCount = 0;
  $('ul li, ol li').each((_, el) => {
    if (liCount >= 20) return false;
    const text = $(el).text().trim();
    if (text && text.length < 200) {
      parts.push(text);
      liCount++;
    }
  });

  // Navigation links (gives feature/page clues)
  $('nav a, header a').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 50) {
      parts.push(text);
    }
  });

  const combined = parts.join(' | ').slice(0, 3000);
  return combined;
}

// ==================== Tech Stack Detection ====================
function detectTechStack($: cheerio.CheerioAPI, headers: any): string[] {
  const detected = new Set<string>();

  // Response headers
  const xPoweredBy = headers['x-powered-by'];
  if (xPoweredBy) {
    if (xPoweredBy.includes('Next.js')) detected.add('Next.js');
    if (xPoweredBy.includes('Express')) detected.add('Express');
    if (xPoweredBy.includes('PHP')) detected.add('PHP');
  }

  const server = headers['server'];
  if (server) {
    if (server.includes('nginx')) detected.add('Nginx');
    if (server.includes('Apache')) detected.add('Apache');
  }

  // Meta generator
  const generator = $('meta[name="generator"]').attr('content');
  if (generator) {
    if (generator.includes('WordPress')) detected.add('WordPress');
    if (generator.includes('Gatsby')) detected.add('Gatsby');
    if (generator.includes('Hugo')) detected.add('Hugo');
    if (generator.includes('Jekyll')) detected.add('Jekyll');
  }

  // Script src patterns
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('_next/')) detected.add('Next.js');
    if (src.includes('__vite') || src.includes('/vite')) detected.add('Vite');
    if (src.includes('vue')) detected.add('Vue.js');
    if (src.includes('angular')) detected.add('Angular');
    if (src.includes('svelte')) detected.add('Svelte');
    if (src.includes('gatsby')) detected.add('Gatsby');
    if (src.includes('remix')) detected.add('Remix');
    if (src.includes('nuxt')) detected.add('Nuxt');
    if (src.includes('react')) detected.add('React');
  });

  // CSS patterns
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('bootstrap')) detected.add('Bootstrap');
    if (href.includes('tailwind')) detected.add('Tailwind CSS');
    if (href.includes('chakra')) detected.add('Chakra UI');
    if (href.includes('material')) detected.add('Material UI');
  });

  // Inline script content
  $('script').each((_, el) => {
    const content = $(el).html() || '';
    if (content.includes('__NEXT_DATA__')) detected.add('Next.js');
    if (content.includes('__NUXT__')) detected.add('Nuxt');
    if (content.includes('__GATSBY')) detected.add('Gatsby');
  });

  // HTML attributes
  const htmlAttrs = $('html').attr();
  if (htmlAttrs) {
    const htmlStr = JSON.stringify(htmlAttrs);
    if (htmlStr.includes('ng-app') || htmlStr.includes('ng-version')) detected.add('Angular');
  }

  return Array.from(detected);
}

// ==================== GitHub Special Handling ====================
interface GitHubRepoData {
  description: string;
  language: string;
  topics: string[];
  stars: number;
  readmeContent: string;
}

async function fetchGitHubData(owner: string, repo: string): Promise<GitHubRepoData | null> {
  try {
    const headers = {
      'User-Agent': 'Vibefolio-URLExtractor/1.0',
    };

    // Fetch repo info
    const repoInfoPromise = axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      timeout: 5000,
    });

    // Fetch README
    const readmePromise = axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        ...headers,
        'Accept': 'application/vnd.github.v3.raw',
      },
      timeout: 5000,
    });

    const [repoInfoRes, readmeRes] = await Promise.all([
      repoInfoPromise.catch(() => null),
      readmePromise.catch(() => null),
    ]);

    if (!repoInfoRes) return null;

    const repoData = repoInfoRes.data;
    const readmeContent = readmeRes?.data || '';

    return {
      description: repoData.description || '',
      language: repoData.language || '',
      topics: repoData.topics || [],
      stars: repoData.stargazers_count || 0,
      readmeContent: typeof readmeContent === 'string' ? readmeContent.slice(0, 3000) : '',
    };
  } catch (err) {
    console.warn('[extract-url] GitHub API fetch failed:', err);
    return null;
  }
}

// ==================== Enhanced AI Analysis ====================
interface AIAnalysisResult {
  features: string[];
  projectType: string;
  suggestedGenre: string;
  suggestedFields: string[];
  targetAudience: string;
}

async function runAIAnalysis(
  title: string,
  siteName: string,
  description: string,
  techStack: string[],
  pageContent: string
): Promise<AIAnalysisResult | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `아래 웹서비스/프로젝트 정보를 분석해서 JSON으로 응답해주세요.

프로젝트명: ${title}
사이트: ${siteName}
설명: ${description}
감지된 기술 스택: ${techStack.join(', ') || '(없음)'}
페이지 콘텐츠:
${pageContent}

JSON 형식:
{
  "features": ["핵심 기능/특징 1", "핵심 기능/특징 2", ...],
  "projectType": "webapp" | "code" | "design" | "game" | "video" | "audio" | "text",
  "suggestedGenre": "webapp" | "code" | "design" | "game" | "video" | "audio" | "text",
  "suggestedFields": ["it", "education", ...],
  "targetAudience": "간단한 타겟 사용자 설명"
}

suggestedFields는 0-3개, 선택 가능한 값: finance, healthcare, beauty, pet, fnb, travel, education, it, lifestyle, business, marketing, art

순수 JSON만 출력하세요. 마크다운 코드블록 사용하지 마세요.`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI analysis timeout')), 10000)
      ),
    ]);

    const text = result.response?.text()?.trim() || '';

    // Remove markdown code blocks if present
    let jsonText = text;
    if (text.startsWith('```')) {
      jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText);
    return {
      features: Array.isArray(parsed.features) ? parsed.features : [],
      projectType: parsed.projectType || 'webapp',
      suggestedGenre: parsed.suggestedGenre || 'webapp',
      suggestedFields: Array.isArray(parsed.suggestedFields) ? parsed.suggestedFields : [],
      targetAudience: parsed.targetAudience || '',
    };
  } catch (err) {
    console.warn('[extract-url] AI analysis failed:', err);
    return null;
  }
}

async function generateAIDescription(
  title: string,
  siteName: string,
  features: string[],
  techStack: string[],
  targetAudience: string,
  pageContent: string
): Promise<string> {
  if (!GEMINI_API_KEY) return '';

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `당신은 크리에이터 포트폴리오 플랫폼의 AI 어시스턴트입니다.
아래 프로젝트 정보를 바탕으로 매력적인 소개글을 작성해주세요.

프로젝트명: ${title}
사이트: ${siteName}
핵심 기능: ${features.join(', ') || '(분석 중)'}
기술 스택: ${techStack.join(', ') || '(없음)'}
타겟: ${targetAudience || '(일반 사용자)'}
페이지 콘텐츠 요약:
${pageContent.slice(0, 1500)}

작성 규칙:
- 4~6문장으로 간결하게
- 이 프로젝트가 어떤 문제를 해결하고, 어떤 가치를 제공하는지 중심으로
- 기술적 특징이 있으면 자연스럽게 언급
- 개발자/크리에이터에게 어필하는 톤
- 마크다운 사용하지 않기 (순수 텍스트)
- "이 프로젝트는~" 같은 딱딱한 시작 금지`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI description timeout')), 10000)
      ),
    ]);

    return result.response?.text()?.trim() || '';
  } catch (err) {
    console.warn('[extract-url] AI description generation failed:', err);
    return '';
  }
}

// ==================== Main Handler ====================
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Check if GitHub URL
    const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    const isGitHub = !!githubMatch;
    let githubData: GitHubRepoData | null = null;

    if (isGitHub && githubMatch) {
      const [, owner, repo] = githubMatch;
      githubData = await fetchGitHubData(owner, repo.replace(/\.git$/, ''));
    }

    // 1. Fetch page with cheerio
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

    // 2. Extract metadata
    const title = (
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      githubData?.description ||
      ''
    ).trim();

    const description = (
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      githubData?.description ||
      ''
    ).trim();

    const ogImage = (
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:url"]').attr('content') ||
      ''
    ).trim();

    const siteName = (
      $('meta[property="og:site_name"]').attr('content') ||
      (isGitHub ? 'GitHub' : '')
    ).trim();

    const keywords = (
      $('meta[name="keywords"]').attr('content') ||
      ''
    ).trim();

    // 3. Archive OG image to Supabase
    let thumbnailUrl = ogImage;
    if (ogImage && ogImage.startsWith('http')) {
      try {
        thumbnailUrl = await uploadImageFromUrl(ogImage, 'projects');
      } catch {
        console.warn('[extract-url] Image archive failed, using original URL');
      }
    }

    // 4. Deep content extraction
    const pageContent = githubData?.readmeContent || extractPageContent($);

    // 5. Tech stack detection
    let techStack = detectTechStack($, response.headers);
    if (isGitHub && githubData) {
      if (githubData.language) {
        techStack.unshift(githubData.language);
      }
      // Add topics as potential tech indicators
      githubData.topics.forEach(topic => {
        const normalized = topic.toLowerCase();
        if (normalized.includes('react')) techStack.push('React');
        if (normalized.includes('vue')) techStack.push('Vue.js');
        if (normalized.includes('nextjs') || normalized.includes('next-js')) techStack.push('Next.js');
        if (normalized.includes('typescript')) techStack.push('TypeScript');
        if (normalized.includes('python')) techStack.push('Python');
        if (normalized.includes('java')) techStack.push('Java');
      });
      techStack = Array.from(new Set(techStack)); // Deduplicate
    }

    // 6. AI Analysis (Phase 1)
    const aiAnalysis = await runAIAnalysis(
      title,
      siteName || new URL(url).hostname,
      description,
      techStack,
      pageContent
    );

    // 7. AI Description (Phase 2)
    let aiDescription = '';
    if (aiAnalysis) {
      aiDescription = await generateAIDescription(
        title,
        siteName || new URL(url).hostname,
        aiAnalysis.features,
        techStack,
        aiAnalysis.targetAudience,
        pageContent
      );
    }

    // 8. Build response
    const responseData: any = {
      success: true,
      title,
      description,
      aiDescription,
      thumbnailUrl,
      sourceUrl: url,
      siteName: siteName || new URL(url).hostname,
      keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      techStack,
      features: aiAnalysis?.features || [],
      projectType: aiAnalysis?.projectType || 'webapp',
      suggestedGenre: aiAnalysis?.suggestedGenre || 'webapp',
      suggestedFields: aiAnalysis?.suggestedFields || [],
      isGitHub,
    };

    if (isGitHub && githubData) {
      responseData.repoStats = {
        stars: githubData.stars,
        language: githubData.language,
        topics: githubData.topics,
      };
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[extract-url] Error:', error?.message);

    // General crawling failure (403, timeout, etc.)
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
