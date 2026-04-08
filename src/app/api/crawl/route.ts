// src/app/api/crawl/route.ts — Prisma
import { NextRequest, NextResponse } from 'next/server';
import { crawlAll } from '@/lib/crawlers/crawler';
import { isAIRelated } from '@/lib/crawlers/sources';
import prisma from '@/lib/db';
import { isAdminEmail, ADMIN_EMAILS } from '@/lib/auth/admins';
import { validateUser } from '@/lib/auth/validate';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('keyword') || undefined;
  const force = searchParams.get('force') === 'true';

  const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isForceRequest = force;

  if (isCronRequest || isForceRequest) {
    return handleCrawl(keyword);
  }

  // 관리자 확인
  const authUser = await validateUser(request);
  if (authUser && isAdminEmail(authUser.email)) {
    return getCrawlStatus();
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const authUser = await validateUser(request);
  const isAdmin = authUser && isAdminEmail(authUser.email);

  if (!isCronRequest && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let keyword: string | undefined;
  let type: string = 'all';
  try {
    const body = await request.json();
    keyword = body.keyword;
    type = body.type || 'all';
  } catch {}

  return handleCrawl(keyword, type);
}

async function getCrawlStatus() {
  try {
    const logs = await prisma.vf_crawl_logs.findMany({
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    const totalCount = await prisma.vf_recruit_items.count();
    const crawledCount = await prisma.vf_recruit_items.count({
      where: { crawled_at: { not: null } },
    });

    const items = await prisma.vf_recruit_items.findMany({ select: { type: true } });
    const byType = {
      job: items.filter((i) => i.type === 'job').length,
      contest: items.filter((i) => i.type === 'contest').length,
      event: items.filter((i) => i.type === 'event').length,
    };

    return NextResponse.json({
      success: true,
      logs,
      statistics: { total: totalCount, crawled: crawledCount, manual: totalCount - crawledCount, byType },
    });
  } catch (error) {
    console.error('[Crawl Status API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch status' }, { status: 500 });
  }
}

async function notifyAdminsOnCrawlIssue(
  status: 'failed' | 'empty',
  details: { type: string; error?: string; itemsFound?: number; duration?: string }
) {
  try {
    const adminUsers = await prisma.vf_users.findMany({
      where: { email: { in: ADMIN_EMAILS } },
      select: { id: true },
    });
    if (!adminUsers.length) return;

    const title = status === 'failed' ? '크롤링 실패 알림' : '크롤링 수확 0건 알림';
    const message = status === 'failed'
      ? `[${details.type}] 크롤링이 실패했습니다: ${details.error || '알 수 없는 오류'}`
      : `[${details.type}] 크롤링 성공했지만 신규 항목 0건 (발견: ${details.itemsFound}건, 소요: ${details.duration})`;

    await prisma.vf_notifications.createMany({
      data: adminUsers.map((admin) => ({
        user_id: admin.id,
        type: 'system',
        title,
        message,
        link: '/admin/recruit/crawl',
        action_label: '크롤링 로그 확인',
        action_url: '/admin/recruit/crawl',
      })),
    });
  } catch (e) {
    console.error('[Crawl Health] Failed to send admin notification:', e);
  }
}

async function handleCrawl(keyword?: string, type: string = 'all') {
  const startTime = Date.now();
  console.log(`[Crawl API] Starting ${type} crawl... ${keyword ? `(Keyword: ${keyword})` : ''}`);

  let result;
  try {
    result = keyword ? await crawlAll(keyword) : await crawlAll();
    if (!result.success) throw new Error(result.error || 'Crawl logic failed');

    // LLM 마감일 후처리
    try {
      const { batchExtractDeadlines } = await import('@/lib/ai/extractDeadline');
      const llmCount = await batchExtractDeadlines(result.items);
      if (llmCount > 0) console.log(`[Crawl API] LLM extracted ${llmCount} deadlines`);
    } catch (llmErr) {
      console.warn('[Crawl API] LLM deadline extraction skipped:', llmErr);
    }

    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const item of result.items) {
      try {
        const existing = await prisma.vf_recruit_items.findFirst({
          where: {
            OR: [
              { title: item.title },
              { link: item.link },
            ],
          },
          select: { id: true },
        });

        const itemData: any = {
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
          category_tags: item.categoryTags || [],
          crawled_at: new Date(),
        };

        // contest 타입은 AI 관련성 재확인 (제외 키워드 포함)
        if (item.type === 'contest' && !isAIRelated(item.title, item.description)) {
          continue;
        }

        if (!existing) {
          await prisma.vf_recruit_items.create({
            data: { ...itemData, is_approved: false, is_active: false },
          });
          addedCount++;
        } else {
          await prisma.vf_recruit_items.update({
            where: { id: existing.id },
            data: itemData,
          });
          updatedCount++;
        }
      } catch {
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    const durationStr = `${(duration / 1000).toFixed(1)}s`;

    await prisma.vf_crawl_logs.create({
      data: {
        type,
        status: 'success',
        items_found: result.itemsFound,
        items_added: addedCount,
        items_updated: updatedCount,
        duration_ms: duration,
      },
    });

    if (addedCount === 0 && !keyword) {
      await notifyAdminsOnCrawlIssue('empty', { type, itemsFound: result.itemsFound, duration: durationStr });
    }

    return NextResponse.json({ success: true, itemsFound: result.itemsFound, itemsAdded: addedCount, itemsUpdated: updatedCount, duration: durationStr });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown fatal error';

    await prisma.vf_crawl_logs.create({
      data: { type, status: 'failed', error_message: errorMessage, duration_ms: duration },
    });

    await notifyAdminsOnCrawlIssue('failed', { type, error: errorMessage });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
