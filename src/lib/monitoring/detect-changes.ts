// src/lib/monitoring/detect-changes.ts
// 프로젝트 변경 감지 모듈 — URL 스냅샷 비교 + AI changelog 생성

import { createHash } from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { generateText } from '@/lib/ai/client';

// HTML에서 동적 요소 제거 후 콘텐츠 해시 생성
export function generateContentHash(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return createHash('md5').update(text).digest('hex');
}

// URL에서 페이지 데이터 추출 (extract-url 패턴 재사용)
export async function fetchProjectData(url: string) {
  const response = await axios.get(url, {
    timeout: 8000,
    headers: { 'User-Agent': 'Vibefolio-Monitor/1.0' },
  });
  const $ = cheerio.load(response.data);

  const title =
    $('meta[property="og:title"]').attr('content') || $('title').text() || '';
  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';

  // 기술스택 감지 (메타 제너레이터, 스크립트 등)
  const techStack: string[] = [];
  if (response.data.includes('__next')) techStack.push('Next.js');
  if (response.data.includes('react')) techStack.push('React');
  if (response.data.includes('vue')) techStack.push('Vue');
  if (response.data.includes('tailwind')) techStack.push('Tailwind CSS');
  if (response.data.includes('firebase')) techStack.push('Firebase');

  // 헤딩/네비게이션에서 기능 섹션 추출
  const features: string[] = [];
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 50) features.push(text);
  });

  const contentHash = generateContentHash(response.data);

  return {
    title,
    description,
    ogImage,
    techStack,
    features: features.slice(0, 10),
    contentHash,
  };
}

// 스냅샷 비교 결과 타입
export interface ChangeResult {
  hasChanges: boolean;
  changes: {
    title_changed: boolean;
    description_changed: boolean;
    og_image_changed: boolean;
    tech_stack_added: string[];
    tech_stack_removed: string[];
    new_features: string[];
    removed_features: string[];
  };
}

// 이전/현재 스냅샷 비교
export function compareSnapshots(
  previous: {
    title: string;
    description: string;
    og_image: string;
    tech_stack: string[];
    features: string[];
  },
  current: {
    title: string;
    description: string;
    ogImage: string;
    techStack: string[];
    features: string[];
  }
): ChangeResult {
  const prevTech = previous.tech_stack || [];
  const currTech = current.techStack || [];
  const prevFeatures = previous.features || [];
  const currFeatures = current.features || [];

  const changes = {
    title_changed: previous.title !== current.title,
    description_changed: previous.description !== current.description,
    og_image_changed: previous.og_image !== current.ogImage,
    tech_stack_added: currTech.filter((t) => !prevTech.includes(t)),
    tech_stack_removed: prevTech.filter((t) => !currTech.includes(t)),
    new_features: currFeatures.filter((f) => !prevFeatures.includes(f)),
    removed_features: prevFeatures.filter((f) => !currFeatures.includes(f)),
  };

  const hasChanges =
    changes.title_changed ||
    changes.description_changed ||
    changes.og_image_changed ||
    changes.tech_stack_added.length > 0 ||
    changes.tech_stack_removed.length > 0 ||
    changes.new_features.length > 0;

  return { hasChanges, changes };
}

// AI changelog 초안 생성
export async function generateChangelog(
  projectTitle: string,
  changes: ChangeResult['changes']
): Promise<{ changelog: string; versionName: string }> {
  const changeSummary: string[] = [];
  if (changes.title_changed) changeSummary.push('제목 변경');
  if (changes.description_changed) changeSummary.push('설명 변경');
  if (changes.og_image_changed) changeSummary.push('대표 이미지 변경');
  if (changes.tech_stack_added.length)
    changeSummary.push(
      `기술스택 추가: ${changes.tech_stack_added.join(', ')}`
    );
  if (changes.new_features.length)
    changeSummary.push(
      `새 섹션: ${changes.new_features.slice(0, 3).join(', ')}`
    );

  const prompt = `프로젝트 "${projectTitle}"의 웹사이트에서 다음 변경사항이 감지되었습니다:
${changeSummary.map((c) => `- ${c}`).join('\n')}

위 변경사항을 바탕으로:
1. 한국어로 2-3문장의 업데이트 changelog를 작성해주세요. 자연스럽고 간결하게.
2. 버전 업데이트 이름을 제안해주세요 (예: "UI 개선 업데이트", "새 기능 추가").

JSON으로 응답해주세요:
{"changelog": "...", "versionName": "..."}`;

  try {
    const result = await generateText({ prompt, jsonMode: true });
    const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { changelog: parsed.changelog, versionName: parsed.versionName };
  } catch {
    // AI 실패 시 fallback
    return {
      changelog: `${projectTitle} 프로젝트가 업데이트되었습니다. ${changeSummary.join(', ')}.`,
      versionName: '최신 업데이트',
    };
  }
}
