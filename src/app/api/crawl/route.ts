// src/app/api/crawl/route.ts
// 공개 크롤링 API 엔드포인트 (Vercel Cron 및 GitHub Actions용)

import { NextRequest, NextResponse } from 'next/server';
import { crawlAll } from '@/lib/crawlers/crawler';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/auth/admins';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * GET 요청 처리
 * - Vercel Cron: CRON_SECRET 헤더와 함께 호출하여 크롤링 실행
 * - Admin UI: 세션과 함께 호출하여 상태(로그/통계) 조회
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('keyword') || undefined;
  const force = searchParams.get('force') === 'true';

  // 1. 크롤링 트리거 조건 확인 (Cron 또는 강제 실행)
  const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isForceRequest = force;

  if (isCronRequest || isForceRequest) {
    return handleCrawl(keyword);
  }

  // 2. 관리자 권한 확인 (세션 체크)
  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '');
  
  const isAdmin = isAdminEmail(user?.email);

  if (isAdmin) {
    return getCrawlStatus();
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * POST 요청 처리 (수동 실행용)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 권한 확인
  const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '');
  const isAdmin = isAdminEmail(user?.email);

  if (!isCronRequest && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let keyword: string | undefined;
  let type: string = 'all';

  try {
    const body = await request.json();
    keyword = body.keyword;
    type = body.type || 'all';
  } catch (e) {
    // Body parsing error
  }
  
  return handleCrawl(keyword, type);
}

/**
 * 크롤링 상태 조회 (로그 및 통계)
 */
async function getCrawlStatus() {
  try {
    // 1. 최근 로그 20개 가져오기
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('crawl_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) throw logsError;

    // 2. 통계 계산
    // 전체 항목 수
    const { count: totalCount } = await supabaseAdmin
      .from('recruit_items')
      .select('*', { count: 'exact', head: true });

    // 크롤링된 항목 수 (is_crawled = true 또는 crawled_at is not null)
    const { count: crawledCount } = await supabaseAdmin
      .from('recruit_items')
      .select('*', { count: 'exact', head: true })
      .not('crawled_at', 'is', null);

    // 카테고리별 통계
    const { data: typeStats } = await supabaseAdmin
      .from('recruit_items')
      .select('type');

    const byType = {
      job: typeStats?.filter(i => i.type === 'job').length || 0,
      contest: typeStats?.filter(i => i.type === 'contest').length || 0,
      event: typeStats?.filter(i => i.type === 'event').length || 0,
    };

    return NextResponse.json({
      success: true,
      logs: logs || [],
      statistics: {
        total: totalCount || 0,
        crawled: crawledCount || 0,
        manual: (totalCount || 0) - (crawledCount || 0),
        byType
      }
    });

  } catch (error) {
    console.error('[Crawl Status API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch status' }, { status: 500 });
  }
}

/**
 * 실제 크롤링 실행 및 로그 저장
 */
async function handleCrawl(keyword?: string, type: string = 'all') {
  const startTime = Date.now();
  console.log(`🚀 [Crawl API] Starting ${type} crawl... ${keyword ? `(Keyword: ${keyword})` : ''}`);
  
  let result;
  try {
    // 키워드가 있으면 검색 크롤링, 없으면 전체 크롤링
    if (keyword) {
      result = await crawlAll(keyword);
    } else if (type !== 'all') {
      // @ts-ignore
      result = await crawlByType(type as any);
    } else {
      result = await crawlAll();
    }
    
    if (!result.success) throw new Error(result.error || 'Crawl logic failed');

    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const item of result.items) {
      try {
        // 중복 체크: 제목 또는 링크 기준 (유연하게)
        // .or() 필터의 따옴표 사용 주의: 값에 따옴표가 있을 경우 에러 발생 가능
        // 제목은 eq로, 링크는 정확히 일치하는지 확인
        const { data: existing } = await supabaseAdmin
          .from('recruit_items')
          .select('id, is_approved, is_active')
          .or(`title.eq."${item.title.replace(/"/g, '')}",link.eq.${item.link}`)
          .maybeSingle();

        const itemData = {
          title: item.title,
          description: item.description,
          type: item.type,
          date: item.date && !['상시', '상시모집'].includes(item.date) ? item.date : null,
          company: item.company,
          link: item.officialLink || item.link,
          source_link: item.link,
          thumbnail: item.image || item.thumbnail,
          location: item.location,
          prize: item.prize,
          salary: item.salary,
          application_target: item.applicationTarget,
          sponsor: item.sponsor,
          total_prize: item.totalPrize,
          first_prize: item.firstPrize,
          start_date: item.startDate,
          category_tags: item.categoryTags,
          crawled_at: new Date().toISOString()
        };

        if (!existing) {
          const { error: insertError } = await supabaseAdmin
            .from('recruit_items')
            .insert([{
              ...itemData,
              is_approved: false,
              is_active: false,
            }]);
          if (!insertError) addedCount++;
          else console.error(`Insert error [${item.title}]:`, insertError.message);
        } else {
          // 기존 항목 업데이트 (이미 활성화된 상태면 정보만 갱신)
          const { error: updateError } = await supabaseAdmin
            .from('recruit_items')
            .update(itemData)
            .eq('id', existing.id);
          if (!updateError) updatedCount++;
        }
      } catch (e) {
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    
    // 로그 저장
    await supabaseAdmin.from('crawl_logs').insert([{
      type: type,
      status: 'success',
      items_found: result.itemsFound,
      items_added: addedCount,
      items_updated: updatedCount,
      duration_ms: duration
    }]);

    return NextResponse.json({
      success: true,
      itemsFound: result.itemsFound,
      itemsAdded: addedCount,
      itemsUpdated: updatedCount,
      duration: `${(duration / 1000).toFixed(1)}s`
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown fatal error';
    
    // 실패 로그 저장
    await supabaseAdmin.from('crawl_logs').insert([{
      type: type,
      status: 'failed',
      error_message: errorMessage,
      duration_ms: duration
    }]);

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

