
import { CrawledItem } from './types';
import { getAIRelevanceScore, getThemedPlaceholder } from './sources';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// ============================================================
// 공모전 전용 AI 크롤링 검색 쿼리 (키워드 없이도 동작)
// ============================================================
const CONTEST_SEARCH_QUERIES = [
  'IT 공모전 소프트웨어 공모전 모집 2026',
  'AI 공모전 해커톤 인공지능 대회 모집 2026',
  '디자인 공모전 UX UI 크리에이티브 모집 2026',
  '영상 공모전 콘텐츠 UCC 숏폼 모집 2026',
  '창업 공모전 아이디어 스타트업 지원사업 2026',
];

/**
 * AI 기반 공모전 크롤러 (키워드 없이도 동작)
 * Tavily API로 다중 검색 쿼리를 병렬 실행하여 공모전 정보 수집
 */
export async function crawlContestAI(): Promise<CrawledItem[]> {
  if (!TAVILY_API_KEY) {
    console.warn('[AI Contest Crawler] TAVILY_API_KEY not set, skipping');
    return [];
  }

  console.log(`[AI Contest Crawler] Starting with ${CONTEST_SEARCH_QUERIES.length} queries...`);

  try {
    // 모든 쿼리를 병렬 실행
    const results = await Promise.all(
      CONTEST_SEARCH_QUERIES.map(query => tavilySearch(query, 'contest', 6))
    );

    const allItems = results.flat();

    // 제목 기준 중복 제거
    const seen = new Set<string>();
    const unique = allItems.filter(item => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 공모전/해커톤/대회 관련 키워드가 있는 항목만 필터 (채용공고 혼입 방지)
    const filtered = unique.filter(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return (
        text.includes('공모') || text.includes('공모전') ||
        text.includes('대회') || text.includes('해커톤') ||
        text.includes('hackathon') || text.includes('contest') ||
        text.includes('competition') || text.includes('챌린지') ||
        text.includes('challenge') || text.includes('지원사업') ||
        text.includes('모집') || text.includes('접수') ||
        text.includes('참가') || text.includes('출품')
      );
    });

    console.log(`[AI Contest Crawler] Found ${allItems.length} → Unique ${unique.length} → Filtered ${filtered.length}`);
    return filtered;
  } catch (error) {
    console.error('[AI Contest Crawler] Failed:', error);
    return [];
  }
}

/**
 * 기존 키워드 기반 MCP 검색 (하위 호환 유지)
 */
export async function crawlMcpSearch(keyword: string): Promise<CrawledItem[]> {
  if (!TAVILY_API_KEY) {
    return [];
  }

  const searchQuery = `${keyword} (채용 OR 공모전 OR 해커톤 OR 지원사업) 모집 공고`;
  return tavilySearch(searchQuery, 'auto', 8);
}

// ============================================================
// Tavily API 공통 함수
// ============================================================
async function tavilySearch(
  query: string,
  forceType: 'job' | 'contest' | 'event' | 'auto',
  maxResults: number
): Promise<CrawledItem[]> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        include_images: true,
        include_answer: false,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API responded with ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    return results.map((item: any) => {
      const title = item.title || '';
      const url = item.url || '';
      const description = item.content || '';

      // 타입 추론
      const type = forceType !== 'auto' ? forceType : inferType(title, description);

      // 날짜 추출 시도
      const extractedDate = extractDate(title, description);

      // 주최자/회사 추출
      const company = extractCompany(title, description, url);

      // 상금 추출
      const prize = type === 'contest' ? extractPrize(title, description) : undefined;

      const aiScore = getAIRelevanceScore(title, description);

      return {
        title: title.replace(/<[^>]*>?/gm, ''),
        description: description.length > 300
          ? description.substring(0, 300) + '...'
          : description,
        link: url,
        officialLink: url,
        date: extractedDate || '확인 필요',
        company,
        location: '온라인/기타',
        type,
        sourceUrl: extractDomain(url),
        image: getThemedPlaceholder(title, type),
        categoryTags: aiScore > 0 ? 'AI, AI검색' : 'AI검색',
        prize,
      } as CrawledItem;
    });
  } catch (error) {
    console.error(`[Tavily Search] Query "${query.substring(0, 30)}..." failed:`, error);
    return [];
  }
}

// ============================================================
// 유틸리티 함수
// ============================================================

/** 제목/설명에서 타입 추론 */
function inferType(title: string, description: string): 'job' | 'contest' | 'event' {
  const text = `${title} ${description}`.toLowerCase();

  const contestSignals = ['공모전', '공모', '대회', '해커톤', 'hackathon', 'contest', 'competition', '챌린지', '출품', '응모'];
  const jobSignals = ['채용', '정규직', '인턴', '경력', 'developer', 'engineer', '연봉', '이력서', '입사'];
  const eventSignals = ['컨퍼런스', '세미나', '밋업', 'meetup', 'conference', '워크숍', 'workshop', '페스티벌'];

  const contestScore = contestSignals.filter(s => text.includes(s)).length;
  const jobScore = jobSignals.filter(s => text.includes(s)).length;
  const eventScore = eventSignals.filter(s => text.includes(s)).length;

  if (jobScore > contestScore && jobScore > eventScore) return 'job';
  if (eventScore > contestScore && eventScore > jobScore) return 'event';
  return 'contest';
}

/** 날짜 추출 (YYYY-MM-DD 패턴 찾기) */
function extractDate(title: string, description: string): string | null {
  const text = `${title} ${description}`;

  // YYYY-MM-DD 또는 YYYY.MM.DD
  const isoMatch = text.match(/20\d{2}[-./]\d{1,2}[-./]\d{1,2}/);
  if (isoMatch) {
    const cleaned = isoMatch[0].replace(/[./]/g, '-');
    // 가장 마지막 날짜(마감일)를 추출하려면 모든 매치에서 마지막 것 사용
    const allDates = text.match(/20\d{2}[-./]\d{1,2}[-./]\d{1,2}/g) || [];
    if (allDates.length > 0) {
      const last = allDates[allDates.length - 1].replace(/[./]/g, '-');
      return last;
    }
    return cleaned;
  }

  // MM월 DD일 패턴
  const koreanMatch = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    const year = new Date().getFullYear();
    const month = koreanMatch[1].padStart(2, '0');
    const day = koreanMatch[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/** 주최자/회사 추출 */
function extractCompany(title: string, description: string, url: string): string {
  const text = `${title} ${description}`;

  // "주최: XXX" 또는 "주관: XXX" 패턴
  const hostMatch = text.match(/(?:주최|주관|후원)\s*[:：]\s*([^\n,.(]{2,20})/);
  if (hostMatch) return hostMatch[1].trim();

  // 도메인 기반 추출
  return extractDomain(url);
}

/** 상금 추출 */
function extractPrize(title: string, description: string): string | undefined {
  const text = `${title} ${description}`;

  // "총 상금 XXX만원" 또는 "상금 X,XXX만원"
  const prizeMatch = text.match(/(?:총\s*)?상금\s*[:：]?\s*([^\n,]{3,30})/);
  if (prizeMatch) return prizeMatch[1].trim();

  // "XXX만원" 패턴
  const amountMatch = text.match(/(\d{1,3}[,.]?\d{0,3}\s*만\s*원)/);
  if (amountMatch) return amountMatch[1].trim();

  return undefined;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return 'Web Search';
  }
}
