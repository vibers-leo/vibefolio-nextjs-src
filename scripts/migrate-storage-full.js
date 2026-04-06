#!/usr/bin/env node
/**
 * Supabase Storage 전체 → NCP 마이그레이션
 * projects/uploads (210개) + profiles/uploads (38개)
 */

const { Client } = require('ssh2');
const { Pool } = require('pg');
const https = require('https');
const path = require('path');

const SUPABASE_URL = 'https://ddnebvjjkxigxbmkqvzr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbmVidmpqa3hpZ3hibWtxdnpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM0NjQwNSwiZXhwIjoyMDgwOTIyNDA1fQ.1rqoyoXAYoBf1FoeXx4_WfREyyPx-XXXVH_di9HJmk8';
const NCP_HOST = '49.50.138.93';
const NCP_USER = 'root';
const NCP_PASSWORD = 'Elfoq2026^';
const NCP_BASE_PATH = '/opt/vibers-storage';
const NCP_PUBLIC_URL = 'https://storage.vibers.co.kr';

const pool = new Pool({
  connectionString: 'postgresql://vibers:vibers2026secure@49.50.138.93:5433/vibers_main?options=-c search_path=vibefolio',
});

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// SSH 연결 재사용
let sshConn = null;
let sshSftp = null;

function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return reject(err); }
        sshConn = conn;
        sshSftp = sftp;
        resolve();
      });
    }).on('error', reject)
      .connect({ host: NCP_HOST, port: 22, username: NCP_USER, password: NCP_PASSWORD, readyTimeout: 15_000 });
  });
}

function mkdirSSH(remotePath) {
  return new Promise((resolve) => {
    sshConn.exec(`mkdir -p ${remotePath}`, () => resolve());
  });
}

function uploadBuffer(buffer, fullPath) {
  return new Promise((resolve, reject) => {
    const ws = sshSftp.createWriteStream(fullPath);
    ws.on('close', resolve);
    ws.on('error', reject);
    ws.end(buffer);
  });
}

async function listBucketFiles(bucket, prefix) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000 }),
  });
  const data = await res.json();
  return Array.isArray(data) ? data.map(f => f.name) : [];
}

async function migrateBucket(bucket, subfolder) {
  console.log(`\n📦 ${bucket}/${subfolder} 마이그레이션`);

  const files = await listBucketFiles(bucket, `${subfolder}/`);
  console.log(`  파일 수: ${files.length}개`);

  const ncpDir = `${NCP_BASE_PATH}/${bucket}/${subfolder}`;
  await mkdirSSH(ncpDir);

  let ok = 0, skip = 0, fail = 0;

  for (const filename of files) {
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${subfolder}/${filename}`;
    const ncpPath = `${ncpDir}/${filename}`;
    const ncpUrl = `${NCP_PUBLIC_URL}/${bucket}/${subfolder}/${filename}`;

    // 이미 NCP에 있는지 확인 (sftp stat)
    const exists = await new Promise(resolve => {
      sshSftp.stat(ncpPath, (err) => resolve(!err));
    });

    if (exists) {
      skip++;
      continue;
    }

    process.stdout.write(`  ${filename.slice(0, 30)}... `);
    try {
      const buf = await downloadBuffer(supabaseUrl);
      await uploadBuffer(buf, ncpPath);
      console.log(`✅`);
      ok++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`  완료: ${ok}개, 스킵(이미존재): ${skip}개, 실패: ${fail}개`);
  return { ok, skip, fail, total: files.length };
}

async function updateDBUrls() {
  console.log('\n🔄 DB URL 업데이트 중...');

  // vf_projects thumbnail_url (projects/uploads)
  const { rowCount: thumbCount } = await pool.query(`
    UPDATE vibefolio.vf_projects
    SET thumbnail_url = REPLACE(
      thumbnail_url,
      '${SUPABASE_URL}/storage/v1/object/public/projects/uploads/',
      '${NCP_PUBLIC_URL}/projects/uploads/'
    )
    WHERE thumbnail_url LIKE '%supabase.co%'
  `);
  console.log(`  vf_projects thumbnail_url: ${thumbCount}개 업데이트`);

  // vf_projects content_text (인라인 이미지)
  const { rowCount: contentCount } = await pool.query(`
    UPDATE vibefolio.vf_projects
    SET content_text = REPLACE(
      content_text,
      '${SUPABASE_URL}/storage/v1/object/public/projects/uploads/',
      '${NCP_PUBLIC_URL}/projects/uploads/'
    )
    WHERE content_text LIKE '%supabase.co%'
  `);
  console.log(`  vf_projects content_text: ${contentCount}개 업데이트`);

  // vf_users profile_image_url (profiles/uploads)
  const { rowCount: avatarCount } = await pool.query(`
    UPDATE vibefolio.vf_users
    SET profile_image_url = REPLACE(
      profile_image_url,
      '${SUPABASE_URL}/storage/v1/object/public/profiles/uploads/',
      '${NCP_PUBLIC_URL}/profiles/uploads/'
    )
    WHERE profile_image_url LIKE '%supabase.co%'
  `);
  console.log(`  vf_users profile_image_url: ${avatarCount}개 업데이트`);

  // vf_projects custom_data 안 Supabase URL (poll_options 이미지 등)
  const { rowCount: customCount } = await pool.query(`
    UPDATE vibefolio.vf_projects
    SET custom_data = REPLACE(
      custom_data::text,
      '${SUPABASE_URL}/storage/v1/object/public/projects/uploads/',
      '${NCP_PUBLIC_URL}/projects/uploads/'
    )::jsonb
    WHERE custom_data::text LIKE '%supabase.co%'
  `);
  console.log(`  vf_projects custom_data: ${customCount}개 업데이트`);
}

async function main() {
  console.log('🚀 Supabase Storage 전체 마이그레이션\n');
  console.log('SSH 연결 중...');
  await connectSSH();
  console.log('SSH 연결 완료');

  const results = [];
  results.push(await migrateBucket('projects', 'uploads'));
  results.push(await migrateBucket('profiles', 'uploads'));

  const total = results.reduce((a, r) => ({ ok: a.ok + r.ok, skip: a.skip + r.skip, fail: a.fail + r.fail, total: a.total + r.total }), { ok: 0, skip: 0, fail: 0, total: 0 });

  await updateDBUrls();

  sshConn.end();
  await pool.end();

  console.log('\n✅ 마이그레이션 완료');
  console.log(`  전체: ${total.total}개 | 신규: ${total.ok}개 | 스킵: ${total.skip}개 | 실패: ${total.fail}개`);
}

main().catch(e => { console.error('💥', e.message); process.exit(1); });
