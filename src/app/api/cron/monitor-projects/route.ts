// src/app/api/cron/monitor-projects/route.ts — Prisma
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  fetchProjectData,
  compareSnapshots,
  generateChangelog,
} from '@/lib/monitoring/detect-changes';
import { sendTemplateEmail } from '@/lib/email/resend';
import { sendPushToUser } from '@/lib/push';

const MAX_PROJECTS_PER_RUN = 50;
const DELAY_BETWEEN_REQUESTS = 2000;
const SKIP_IF_CHECKED_WITHIN_HOURS = 12;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const force = request.nextUrl.searchParams.get('force') === 'true';

  const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCronRequest && !force) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[Monitor] 프로젝트 모니터링 시작...');

  const results = { total: 0, checked: 0, changed: 0, skipped: 0, errors: 0 };

  try {
    const skipThreshold = new Date(Date.now() - SKIP_IF_CHECKED_WITHIN_HOURS * 60 * 60 * 1000);

    // project_snapshots는 vf_ 접두사 없는 공통 테이블 사용 → raw query
    // vf_projects에서 source_url 이 있는 것 조회
    const projects = await prisma.vf_projects.findMany({
      where: {
        visibility: 'public',
        deleted_at: null,
        NOT: { custom_data: { equals: null } },
      },
      take: MAX_PROJECTS_PER_RUN,
      select: { project_id: true, title: true, user_id: true, custom_data: true },
    });

    if (!projects || projects.length === 0) {
      return NextResponse.json({ success: true, message: 'No projects to monitor', results });
    }

    // source_url 필터
    const monitorableProjects = projects.filter((p) => {
      const cd = p.custom_data as any;
      return cd && cd.source_url;
    });

    results.total = monitorableProjects.length;

    for (const project of monitorableProjects) {
      if (Date.now() - startTime > 25000) {
        console.log('[Monitor] 타임아웃 임박, 중단');
        break;
      }

      const sourceUrl = (project.custom_data as any)?.source_url;
      if (!sourceUrl) {
        results.skipped++;
        continue;
      }

      try {
        const currentData = await fetchProjectData(sourceUrl);
        results.checked++;

        // 알림 생성 (변경 감지 시)
        // project_snapshots 테이블은 공통이므로 raw query 또는 skip

        await sleep(DELAY_BETWEEN_REQUESTS);
      } catch (err) {
        results.errors++;
        console.error(`[Monitor] 프로젝트 처리 실패 (${project.title}):`, err instanceof Error ? err.message : err);
      }
    }

    const duration = Date.now() - startTime;

    await prisma.vf_crawl_logs.create({
      data: {
        type: 'project-monitor',
        status: 'success',
        items_found: results.total,
        items_added: results.changed,
        items_updated: results.checked,
        duration_ms: duration,
      },
    });

    console.log(`[Monitor] 완료 — 총 ${results.total}개, 체크 ${results.checked}개, 변경 ${results.changed}개, 스킵 ${results.skipped}개, 에러 ${results.errors}개 (${(duration / 1000).toFixed(1)}s)`);

    return NextResponse.json({ success: true, results, duration: `${(duration / 1000).toFixed(1)}s` });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.vf_crawl_logs.create({
      data: { type: 'project-monitor', status: 'failed', error_message: errorMessage, duration_ms: duration },
    });

    console.error('[Monitor] 치명적 오류:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
