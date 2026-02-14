import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * category_tags 키워드 → 사용자 interests ID 매핑
 * recruit_items.category_tags: "AI, 디자인" (한글 키워드)
 * profiles.interests: { genres: ["code", "design"], fields: ["it", "art"] }
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
 * 승인된 recruit_items에 대해 관심사 매칭 후 알림 발송
 */
export async function matchAndNotify(approvedItemIds: number[]): Promise<MatchResult> {
  if (approvedItemIds.length === 0) return { matched: 0, notified: 0 };

  // 1. 승인된 항목 조회
  const { data: items, error: itemsError } = await supabaseAdmin
    .from('recruit_items')
    .select('id, title, type, category_tags')
    .in('id', approvedItemIds);

  if (itemsError || !items || items.length === 0) {
    console.warn('[Recommendations] No items found for IDs:', approvedItemIds);
    return { matched: 0, notified: 0 };
  }

  // 2. interests가 설정된 사용자 조회
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, interests')
    .not('interests', 'is', null);

  if (profilesError || !profiles || profiles.length === 0) {
    return { matched: 0, notified: 0 };
  }

  // 3. 오늘 이미 보낸 추천 알림 수 확인
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let totalMatched = 0;
  let totalNotified = 0;

  for (const item of items) {
    if (!item.category_tags) continue;

    // category_tags 파싱 → 관심사 ID 집합
    const tags = item.category_tags.split(',').map((t: string) => t.trim());
    const matchGenres = new Set<string>();
    const matchFields = new Set<string>();

    for (const tag of tags) {
      for (const [keyword, genres] of Object.entries(TAG_TO_GENRES)) {
        if (tag.includes(keyword)) genres.forEach((g) => matchGenres.add(g));
      }
      for (const [keyword, fields] of Object.entries(TAG_TO_FIELDS)) {
        if (tag.includes(keyword)) fields.forEach((f) => matchFields.add(f));
      }
    }

    if (matchGenres.size === 0 && matchFields.size === 0) continue;

    // 4. 각 사용자의 interests와 매칭
    for (const profile of profiles) {
      const interests = profile.interests as { genres?: string[]; fields?: string[] } | null;
      if (!interests) continue;

      const userGenres = interests.genres || [];
      const userFields = interests.fields || [];

      const genreMatch = userGenres.some((g) => matchGenres.has(g));
      const fieldMatch = userFields.some((f) => matchFields.has(f));

      if (!genreMatch && !fieldMatch) continue;
      totalMatched++;

      // 5. 일일 알림 제한 (최대 3개)
      const { count } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('type', 'system')
        .gte('created_at', todayStart.toISOString())
        .like('title', '%추천%');

      if ((count || 0) >= 3) continue;

      // 6. 알림 발송
      const typeLabel = item.type === 'job' ? '채용' : item.type === 'contest' ? '공모전' : '이벤트';
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: profile.id,
          type: 'system',
          title: `관심 분야 ${typeLabel} 추천!`,
          message: `'${item.title}' - 관심사와 일치하는 새 ${typeLabel}입니다.`,
          link: `/recruit?highlight=${item.id}`,
          read: false,
        });

      if (!notifError) totalNotified++;
    }
  }

  console.log(`[Recommendations] Matched: ${totalMatched}, Notified: ${totalNotified}`);
  return { matched: totalMatched, notified: totalNotified };
}
