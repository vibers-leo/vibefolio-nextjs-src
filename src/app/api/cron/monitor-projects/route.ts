// src/app/api/cron/monitor-projects/route.ts
// 프로젝트 모니터링 Cron — 매일 등록된 프로젝트의 변경사항 감지 + AI changelog + 알림

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  fetchProjectData,
  compareSnapshots,
  generateChangelog,
} from '@/lib/monitoring/detect-changes';
import { sendTemplateEmail } from '@/lib/email/resend';
import { sendPushToUser } from '@/lib/push';

const MAX_PROJECTS_PER_RUN = 50;
const DELAY_BETWEEN_REQUESTS = 2000; // 2초 간격 (서버 부하 방지)
const SKIP_IF_CHECKED_WITHIN_HOURS = 12;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const force = request.nextUrl.searchParams.get('force') === 'true';

  // 권한 확인: CRON_SECRET 또는 ?force=true
  const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCronRequest && !force) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[Monitor] 프로젝트 모니터링 시작...');

  const results = {
    total: 0,
    checked: 0,
    changed: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // 12시간 이내 체크된 프로젝트 제외를 위한 기준 시각
    const skipThreshold = new Date(
      Date.now() - SKIP_IF_CHECKED_WITHIN_HOURS * 60 * 60 * 1000
    ).toISOString();

    // source_url이 설정된 공개 프로젝트 조회
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title, user_id, custom_data')
      .eq('is_public', true)
      .not('custom_data->source_url', 'is', null)
      .limit(MAX_PROJECTS_PER_RUN);

    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) {
      console.log('[Monitor] 모니터링 대상 프로젝트 없음');
      return NextResponse.json({ success: true, message: 'No projects to monitor', results });
    }

    results.total = projects.length;

    for (const project of projects) {
      // 타임아웃 체크 (25초 안전 마진)
      if (Date.now() - startTime > 25000) {
        console.log('[Monitor] 타임아웃 임박, 중단');
        break;
      }

      const sourceUrl = project.custom_data?.source_url;
      if (!sourceUrl) {
        results.skipped++;
        continue;
      }

      try {
        // 최근 12시간 내 체크된 프로젝트 스킵
        const { data: recentSnapshot } = await supabaseAdmin
          .from('project_snapshots')
          .select('id')
          .eq('project_id', project.id)
          .gte('crawled_at', skipThreshold)
          .limit(1)
          .maybeSingle();

        if (recentSnapshot) {
          results.skipped++;
          continue;
        }

        // 페이지 데이터 가져오기
        const currentData = await fetchProjectData(sourceUrl);
        results.checked++;

        // 이전 스냅샷 조회
        const { data: prevSnapshot } = await supabaseAdmin
          .from('project_snapshots')
          .select('*')
          .eq('project_id', project.id)
          .order('crawled_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!prevSnapshot) {
          // 첫 스냅샷: 기준선 저장, 알림 생략
          await supabaseAdmin.from('project_snapshots').insert({
            project_id: project.id,
            title: currentData.title,
            description: currentData.description,
            og_image: currentData.ogImage,
            tech_stack: currentData.techStack,
            features: currentData.features,
            content_hash: currentData.contentHash,
          });
          console.log(`[Monitor] 기준선 저장: ${project.title} (ID: ${project.id})`);
        } else if (prevSnapshot.content_hash !== currentData.contentHash) {
          // 변경 감지됨
          const changeResult = compareSnapshots(
            {
              title: prevSnapshot.title || '',
              description: prevSnapshot.description || '',
              og_image: prevSnapshot.og_image || '',
              tech_stack: prevSnapshot.tech_stack || [],
              features: prevSnapshot.features || [],
            },
            currentData
          );

          if (changeResult.hasChanges) {
            results.changed++;

            // AI changelog 생성
            const { changelog, versionName } = await generateChangelog(
              project.title,
              changeResult.changes
            );

            // 새 스냅샷 저장
            await supabaseAdmin.from('project_snapshots').insert({
              project_id: project.id,
              title: currentData.title,
              description: currentData.description,
              og_image: currentData.ogImage,
              tech_stack: currentData.techStack,
              features: currentData.features,
              content_hash: currentData.contentHash,
              suggested_changelog: changelog,
              suggested_version_name: versionName,
            });

            // 인앱 알림 생성
            await supabaseAdmin.from('notifications').insert({
              user_id: project.user_id,
              type: 'project-update',
              title: `${project.title} 변경 감지`,
              message: changelog,
              link: `/projects/${project.id}/versions`,
              action_label: '버전 업데이트하기',
              action_url: `/projects/${project.id}/versions`,
            });

            // 푸시 알림
            await sendPushToUser({
              userId: project.user_id,
              title: `${project.title} 변경 감지`,
              body: versionName,
              data: { url: `/projects/${project.id}/versions` },
            }).catch(() => {
              // 푸시 실패는 무시
            });

            // 이메일 알림 (유저 이메일 조회)
            try {
              const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('email, display_name')
                .eq('id', project.user_id)
                .maybeSingle();

              if (profile?.email) {
                await sendTemplateEmail({
                  to: profile.email,
                  subject: `[Vibefolio] ${project.title} 프로젝트 변경 감지`,
                  template: 'project-update',
                  data: {
                    projectTitle: project.title,
                    changesSummary: changelog,
                    updateUrl: `https://vibefolio.net/projects/${project.id}/versions`,
                  },
                });
              }
            } catch (emailErr) {
              console.warn(`[Monitor] 이메일 발송 실패 (project ${project.id}):`, emailErr);
            }

            console.log(`[Monitor] 변경 감지: ${project.title} — ${versionName}`);
          } else {
            // content_hash만 다르고 주요 변경 없음 → 스냅샷만 갱신
            await supabaseAdmin.from('project_snapshots').insert({
              project_id: project.id,
              title: currentData.title,
              description: currentData.description,
              og_image: currentData.ogImage,
              tech_stack: currentData.techStack,
              features: currentData.features,
              content_hash: currentData.contentHash,
            });
          }
        }
        // content_hash 동일 → 변경 없음, 스킵

        // 요청 간 딜레이
        await sleep(DELAY_BETWEEN_REQUESTS);
      } catch (err) {
        results.errors++;
        console.error(
          `[Monitor] 프로젝트 처리 실패 (${project.title}, ID: ${project.id}):`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const duration = Date.now() - startTime;

    // 크롤 로그 저장
    await supabaseAdmin.from('crawl_logs').insert({
      type: 'project-monitor',
      status: 'success',
      items_found: results.total,
      items_added: results.changed,
      items_updated: results.checked,
      duration_ms: duration,
    });

    console.log(
      `[Monitor] 완료 — 총 ${results.total}개, 체크 ${results.checked}개, 변경 ${results.changed}개, 스킵 ${results.skipped}개, 에러 ${results.errors}개 (${(duration / 1000).toFixed(1)}s)`
    );

    return NextResponse.json({ success: true, results, duration: `${(duration / 1000).toFixed(1)}s` });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabaseAdmin.from('crawl_logs').insert({
      type: 'project-monitor',
      status: 'failed',
      error_message: errorMessage,
      duration_ms: duration,
    });

    console.error('[Monitor] 치명적 오류:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
