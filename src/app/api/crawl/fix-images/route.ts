// 기존 크롤링 데이터 중 placeholder 이미지를 가진 항목의 실제 이미지 재수집
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('x-cron-secret') || request.headers.get('authorization');

  if (cronSecret && authHeader !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TAVILY_API_KEY) {
    return NextResponse.json({ error: 'TAVILY_API_KEY not set' }, { status: 500 });
  }

  try {
    // placeholder 이미지를 가진 항목 조회 (unsplash URL 또는 thumbnail 없음)
    const { data: items, error } = await supabaseAdmin
      .from('recruit_items')
      .select('id, title, link, thumbnail, type')
      .or('thumbnail.is.null,thumbnail.like.%unsplash.com%')
      .limit(50);

    if (error) throw error;
    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, message: 'No items need image fix', updated: 0 });
    }

    console.log(`[Fix Images] Found ${items.length} items with placeholder images`);

    let updated = 0;
    let failed = 0;

    // 3개씩 병렬 처리
    for (let i = 0; i < items.length; i += 3) {
      const batch = items.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(item => fetchImageForItem(item))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const item = batch[j];
        if (result.status === 'fulfilled' && result.value) {
          const { error: updateErr } = await supabaseAdmin
            .from('recruit_items')
            .update({ thumbnail: result.value })
            .eq('id', item.id);
          if (!updateErr) {
            updated++;
            console.log(`[Fix Images] Updated: ${item.title.substring(0, 30)}`);
          }
        } else {
          failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      updated,
      failed,
    });
  } catch (err: any) {
    console.error('[Fix Images] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function fetchImageForItem(item: { title: string; link: string; type: string }): Promise<string | null> {
  try {
    // Tavily 이미지 검색: 항목 제목으로 검색
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `${item.title} 포스터`,
        search_depth: 'basic',
        include_images: true,
        include_answer: false,
        max_results: 3,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();

    // 이미지 소스: 개별 결과 이미지 → 상위 이미지 배열
    const results = data.results || [];
    for (const r of results) {
      if (r.image) return r.image;
      if (r.thumbnail) return r.thumbnail;
    }

    const images = (data.images || [])
      .map((img: any) => typeof img === 'string' ? img : img?.url)
      .filter(Boolean);

    if (images.length > 0) return images[0];

    return null;
  } catch {
    return null;
  }
}
