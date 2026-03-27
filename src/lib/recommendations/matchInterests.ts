import prisma from '@/lib/db';

/**
 * category_tags 키워드 → 사용자 interests ID 매핑
 */
const TAG_TO_GENRES: Record<string, string[]> = {
  'AI': ['code'],
  '소프트웨어': ['code'],
  'SW': ['code'],
  'IT': ['code', 'webapp'],
  '웹': ['webapp', 'code'],
  '앱': ['webapp'],
  '디자인': ['design', 'graphic'],
  'UX': ['design'],
  'UI': ['design', 'webapp'],
  '그래픽': ['graphic'],
  '영상': ['video'],
  '영화': ['cinema'],
  '콘텐츠': ['video'],
  'UCC': ['video'],
  '숏폼': ['video'],
  '애니': ['animation'],
  '웹툰': ['animation'],
  '게임': ['game'],
  '3D': ['3d'],
  '사진': ['photo'],
  '포토': ['photo'],
  '음악': ['audio'],
  '오디오': ['audio'],
};

const TAG_TO_FIELDS: Record<string, string[]> = {
  'AI': ['it'],
  'IT': ['it'],
  '소프트웨어': ['it'],
  '교육': ['education'],
  '마케팅': ['marketing'],
  '광고': ['marketing'],
  '창업': ['business'],
  '스타트업': ['business'],
  '금융': ['finance'],
  '경제': ['finance'],
  '헬스': ['healthcare'],
  '의료': ['healthcare'],
  '뷰티': ['beauty'],
  '패션': ['beauty'],
  '여행': ['travel'],
  '레저': ['travel'],
  '반려': ['pet'],
  '요리': ['fnb'],
  'F&B': ['fnb'],
  '예술': ['art'],
  '문화': ['art'],
};

interface MatchResult {
  matched: number;
  notified: number;
}

/**
 * 승인된 recruit_items에 대해 관심사 매칭 후 알림 발송 — Prisma
 */
export async function matchAndNotify(approvedItemIds: number[]): Promise<MatchResult> {
  if (approvedItemIds.length === 0) return { matched: 0, notified: 0 };

  const items = await prisma.vf_recruit_items.findMany({
    where: { id: { in: approvedItemIds.map(String) } },
    select: { id: true, title: true, type: true, category_tags: true },
  });

  if (!items || items.length === 0) {
    return { matched: 0, notified: 0 };
  }

  const users = await prisma.vf_users.findMany({
    where: { interests: { not: { equals: null } } },
    select: { id: true, interests: true },
  });

  if (!users || users.length === 0) return { matched: 0, notified: 0 };

  let totalMatched = 0;
  let totalNotified = 0;

  for (const item of items) {
    if (!item.category_tags || item.category_tags.length === 0) continue;

    const matchGenres = new Set<string>();
    const matchFields = new Set<string>();

    for (const tag of item.category_tags) {
      for (const [keyword, genres] of Object.entries(TAG_TO_GENRES)) {
        if (tag.includes(keyword)) genres.forEach((g) => matchGenres.add(g));
      }
      for (const [keyword, fields] of Object.entries(TAG_TO_FIELDS)) {
        if (tag.includes(keyword)) fields.forEach((f) => matchFields.add(f));
      }
    }

    if (matchGenres.size === 0 && matchFields.size === 0) continue;

    for (const user of users) {
      const interests = user.interests as { genres?: string[]; fields?: string[] } | null;
      if (!interests) continue;

      const userGenres = interests.genres || [];
      const userFields = interests.fields || [];

      const genreMatch = userGenres.some((g) => matchGenres.has(g));
      const fieldMatch = userFields.some((f) => matchFields.has(f));

      if (!genreMatch && !fieldMatch) continue;
      totalMatched++;

      const typeLabel = item.type === 'job' ? '채용' : item.type === 'contest' ? '공모전' : '이벤트';
      try {
        await prisma.vf_notifications.create({
          data: {
            user_id: user.id,
            type: 'system',
            title: `관심 분야 ${typeLabel} 추천!`,
            message: `'${item.title}' - 관심사와 일치하는 새 ${typeLabel}입니다.`,
            link: `/recruit?highlight=${item.id}`,
            read: false,
          },
        });
        totalNotified++;
      } catch {}
    }
  }

  console.log(`[Recommendations] Matched: ${totalMatched}, Notified: ${totalNotified}`);
  return { matched: totalMatched, notified: totalNotified };
}
