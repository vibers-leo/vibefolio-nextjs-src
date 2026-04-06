#!/usr/bin/env node
/**
 * Supabase → NCP 마이그레이션 v2
 * - public.Project → vibefolio.vf_projects
 * - public.profiles → vibefolio.vf_users
 * - Supabase Storage → NCP Object Storage (thumbnails)
 */

const { Pool } = require('pg');
const https = require('https');
const http = require('http');
const fs = require('fs');

const SUPABASE_URL = 'https://ddnebvjjkxigxbmkqvzr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbmVidmpqa3hpZ3hibWtxdnpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM0NjQwNSwiZXhwIjoyMDgwOTIyNDA1fQ.1rqoyoXAYoBf1FoeXx4_WfREyyPx-XXXVH_di9HJmk8';

// NCP 연결
const pool = new Pool({
  connectionString: 'postgresql://vibers:vibers2026secure@49.50.138.93:5433/vibers_main?options=-c search_path=vibefolio',
});

async function fetchSupabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

async function migrateUsers(profiles) {
  console.log(`\n📦 vf_users 마이그레이션 (${profiles.length}명)`);
  let inserted = 0, skipped = 0;

  for (const p of profiles) {
    try {
      await pool.query(`
        INSERT INTO vibefolio.vf_users (id, email, username, profile_image_url, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          profile_image_url = EXCLUDED.profile_image_url,
          role = EXCLUDED.role,
          updated_at = NOW()
      `, [
        p.id,
        `${p.id}@placeholder.vibefolio.com`,
        p.username || '익명',
        p.profile_image_url || p.avatar_url || null,
        p.role || 'user',
      ]);
      inserted++;
    } catch (e) {
      console.log(`  ⚠️  user ${p.id} 스킵: ${e.message}`);
      skipped++;
    }
  }
  console.log(`  ✅ ${inserted}명 upsert, ${skipped}명 스킵`);
}

async function migrateProjects(projects) {
  console.log(`\n📦 vf_projects 마이그레이션 (${projects.length}개)`);
  let inserted = 0, skipped = 0;

  for (const p of projects) {
    try {
      await pool.query(`
        INSERT INTO vibefolio.vf_projects (
          project_id, user_id, category_id, title, description,
          content_text, rendering_type, custom_data, thumbnail_url,
          views, views_count, likes_count, comments_count,
          visibility, summary, assets, alt_description,
          audit_deadline, is_feedback_requested, feedback_requested_at,
          feedback_mode, allow_michelin_rating, allow_stickers,
          allow_secret_comments, scheduled_at, deleted_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22, $23,
          $24, $25, $26,
          $27, $28
        )
        ON CONFLICT (project_id) DO UPDATE SET
          title = EXCLUDED.title,
          thumbnail_url = EXCLUDED.thumbnail_url,
          content_text = EXCLUDED.content_text,
          views_count = EXCLUDED.views_count,
          likes_count = EXCLUDED.likes_count,
          updated_at = EXCLUDED.updated_at
      `, [
        p.project_id,
        p.user_id,
        p.category_id,
        p.title,
        p.description || null,
        p.content_text || null,
        p.rendering_type || 'rich_text',
        JSON.stringify(p.custom_data || {}),
        p.thumbnail_url || null,
        p.views || 0,
        p.views_count || 0,
        p.likes_count || 0,
        p.comments_count || 0,
        p.visibility || 'public',
        p.summary || null,
        p.assets ? JSON.stringify(p.assets) : null,
        p.alt_description || null,
        p.audit_deadline || null,
        p.is_feedback_requested || false,
        p.feedback_requested_at || null,
        p.feedback_mode || 'general',
        p.allow_michelin_rating !== false,
        p.allow_stickers !== false,
        p.allow_secret_comments !== false,
        p.scheduled_at || null,
        p.deleted_at || null,
        p.created_at || new Date().toISOString(),
        p.updated_at || new Date().toISOString(),
      ]);
      inserted++;
      console.log(`  ✅ #${p.project_id} "${p.title}" (썸네일: ${p.thumbnail_url ? '있음' : '없음'})`);
    } catch (e) {
      console.log(`  ❌ #${p.project_id} "${p.title}" 실패: ${e.message}`);
      skipped++;
    }
  }
  console.log(`\n  총 ${inserted}개 upsert, ${skipped}개 실패`);
}

async function main() {
  console.log('🚀 Supabase → NCP 마이그레이션 시작\n');

  // 1. profiles 가져오기
  const profiles = JSON.parse(fs.readFileSync('/tmp/supabase_profiles.json'));

  // 2. projects 가져오기 (deleted 포함, 전체)
  console.log('Supabase에서 전체 프로젝트 가져오는 중...');
  const allProjects = await fetchSupabase('Project?select=*&order=project_id.asc');
  console.log(`전체 프로젝트: ${allProjects.length}개`);

  // 3. users 먼저
  await migrateUsers(profiles);

  // 4. projects
  await migrateProjects(allProjects);

  // 5. 결과 확인
  const result = await pool.query('SELECT COUNT(*) FROM vibefolio.vf_projects WHERE deleted_at IS NULL');
  console.log(`\n✅ NCP vf_projects 현재 공개 게시물: ${result.rows[0].count}개`);

  await pool.end();
  console.log('\n🎉 마이그레이션 완료!');
}

main().catch(e => {
  console.error('💥 오류:', e);
  process.exit(1);
});
