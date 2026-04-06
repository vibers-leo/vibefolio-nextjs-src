/**
 * Supabase → NCP PostgreSQL 데이터 마이그레이션 스크립트
 *
 * 대상 테이블:
 *   - Supabase.profiles → NCP vibefolio.profiles
 *   - Supabase.projects → NCP vibefolio.projects
 *
 * 실행: node scripts/migrate-supabase-to-ncp.js
 */

const { Pool } = require('pg');

// ─── 설정 ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mwtgvkrvsrhxwmasvzms.supabase.co';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGd2a3J2c3JoeHdtYXN2em1zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA5OTYyMiwiZXhwIjoyMDg0Njc1NjIyfQ.ShiCnsH78xegAztdsTFg5pAgbwY-29s2cLyRraF_Zxo';

const NCP_DATABASE_URL =
  'postgresql://vibers:vibers2026secure@49.50.138.93:5433/vibers_main';

const ncpPool = new Pool({
  connectionString: NCP_DATABASE_URL,
  ssl: false,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

// ─── Supabase REST fetch ─────────────────────────────────────────────────────
async function fetchSupabase(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*${params ? '&' + params : ''}&limit=1000`;
  console.log(`  📡 Fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed [${res.status}]: ${text}`);
  }
  return res.json();
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────
function nullify(val) {
  return val === undefined ? null : val;
}

function toJsonStr(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

// ─── profiles 마이그레이션 ───────────────────────────────────────────────────
async function migrateProfiles(client) {
  console.log('\n[1/2] profiles 데이터 fetch 중...');
  const rows = await fetchSupabase('profiles');
  console.log(`  → ${rows.length}건 조회됨`);

  if (rows.length === 0) {
    console.log('  데이터 없음, 건너뜀.');
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const result = await client.query(
        `INSERT INTO vibefolio.profiles (
          id, created_at, updated_at,
          email, username, nickname,
          profile_image, bio, role, is_public,
          cover_image_url, social_links, interests, expertise,
          gender, age_group, occupation,
          onboarding_completed, password_hash, provider, provider_id,
          avatar_url, points
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          nullify(row.created_at),
          nullify(row.updated_at),
          nullify(row.email),
          nullify(row.username),
          nullify(row.nickname),
          nullify(row.profile_image),
          nullify(row.bio),
          row.role ?? 'user',
          row.is_public !== undefined ? row.is_public : true,
          nullify(row.cover_image_url),
          toJsonStr(row.social_links) ?? '{}',
          toJsonStr(row.interests) ?? '[]',
          toJsonStr(row.expertise) ?? '[]',
          nullify(row.gender),
          nullify(row.age_group),
          nullify(row.occupation),
          row.onboarding_completed ?? false,
          nullify(row.password_hash),
          row.provider ?? 'email',
          nullify(row.provider_id),
          nullify(row.avatar_url),
          row.points ?? 0,
        ]
      );
      if (result.rowCount > 0) inserted++;
      else skipped++;
    } catch (err) {
      errors++;
      console.error(`  ❌ profiles 오류 [id=${row.id}]:`, err.message);
    }
  }

  console.log(`  ✅ profiles: ${inserted}건 삽입, ${skipped}건 스킵(충돌), ${errors}건 오류`);
}

// ─── projects 마이그레이션 ───────────────────────────────────────────────────
async function migrateProjects(client) {
  console.log('\n[2/2] projects 데이터 fetch 중...');
  const rows = await fetchSupabase('projects');
  console.log(`  → ${rows.length}건 조회됨`);

  if (rows.length === 0) {
    console.log('  데이터 없음, 건너뜀.');
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const result = await client.query(
        `INSERT INTO vibefolio.projects (
          id, title, summary, content_text, description,
          category_id, thumbnail_url, visibility,
          audit_deadline, is_growth_requested,
          author_id, author_email,
          created_at, updated_at, scheduled_at,
          views_count, likes_count, evaluations_count,
          site_url, rendering_type, alt_description, custom_data
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.title,
          nullify(row.summary),
          nullify(row.content_text),
          nullify(row.description),
          nullify(row.category_id),
          nullify(row.thumbnail_url),
          row.visibility ?? 'public',
          nullify(row.audit_deadline),
          row.is_growth_requested ?? false,
          nullify(row.author_id),
          nullify(row.author_email),
          nullify(row.created_at),
          nullify(row.updated_at),
          nullify(row.scheduled_at),
          row.views_count ?? 0,
          row.likes_count ?? 0,
          row.evaluations_count ?? 0,
          nullify(row.site_url),
          row.rendering_type ?? 'rich_text',
          nullify(row.alt_description),
          toJsonStr(row.custom_data) ?? '{}',
        ]
      );
      if (result.rowCount > 0) inserted++;
      else skipped++;
    } catch (err) {
      errors++;
      console.error(`  ❌ projects 오류 [id=${row.id}, title=${row.title}]:`, err.message);
    }
  }

  console.log(`  ✅ projects: ${inserted}건 삽입, ${skipped}건 스킵(충돌), ${errors}건 오류`);
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Supabase → NCP PostgreSQL 마이그레이션 시작 ===');
  console.log(`대상 DB: ${NCP_DATABASE_URL.replace(/:.*@/, ':***@')}`);

  let client;
  try {
    client = await ncpPool.connect();
    console.log('✅ NCP DB 연결 성공');

    // 스키마 존재 확인
    const schemaCheck = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'vibefolio'`
    );
    if (schemaCheck.rowCount === 0) {
      throw new Error('vibefolio 스키마가 NCP DB에 존재하지 않습니다. Prisma migrate를 먼저 실행하세요.');
    }
    console.log('✅ vibefolio 스키마 확인됨');

    // 테이블 존재 확인
    const tableCheck = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'vibefolio' AND table_name IN ('profiles', 'projects')`
    );
    const tables = tableCheck.rows.map((r) => r.table_name);
    console.log(`✅ 확인된 테이블: ${tables.join(', ')}`);

    if (!tables.includes('profiles')) {
      console.warn('⚠️  profiles 테이블 없음 — 건너뜀');
    } else {
      await migrateProfiles(client);
    }

    if (!tables.includes('projects')) {
      console.warn('⚠️  projects 테이블 없음 — 건너뜀');
    } else {
      await migrateProjects(client);
    }

    console.log('\n=== 마이그레이션 완료 ===');
  } catch (err) {
    console.error('\n❌ 치명적 오류:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await ncpPool.end();
  }
}

main();
