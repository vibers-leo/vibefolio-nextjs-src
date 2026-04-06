#!/usr/bin/env node
/**
 * Supabase Storage → NCP 서버 썸네일 마이그레이션
 * thumbnail_url을 NCP URL로 업데이트
 */

const { Pool } = require('pg');
const { Client } = require('ssh2');
const path = require('path');
const https = require('https');
const http = require('http');

const NCP_HOST = '49.50.138.93';
const NCP_USER = 'root';
const NCP_PASSWORD = 'Elfoq2026^';
const NCP_BASE_PATH = '/opt/vibers-storage';
const NCP_PUBLIC_URL = 'https://storage.vibers.co.kr';

const pool = new Pool({
  connectionString: 'postgresql://vibers:vibers2026secure@49.50.138.93:5433/vibers_main?options=-c search_path=vibefolio',
});

/** URL에서 Buffer 다운로드 */
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/** SSH로 NCP 서버에 파일 업로드 */
function uploadToNCP(buffer, remotePath, filename) {
  const fullRemotePath = `${NCP_BASE_PATH}/${remotePath}`;
  const fullFilePath = `${fullRemotePath}/${filename}`;

  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('SSH 연결 타임아웃'));
    }, 30_000);

    conn.on('ready', () => {
      conn.exec(`mkdir -p ${fullRemotePath}`, (err) => {
        if (err) { clearTimeout(timeout); conn.end(); return reject(err); }

        conn.sftp((sftpErr, sftp) => {
          if (sftpErr) { clearTimeout(timeout); conn.end(); return reject(sftpErr); }

          const ws = sftp.createWriteStream(fullFilePath);
          ws.on('close', () => {
            clearTimeout(timeout);
            conn.end();
            resolve(`${NCP_PUBLIC_URL}/${remotePath}/${filename}`);
          });
          ws.on('error', (e) => { clearTimeout(timeout); conn.end(); reject(e); });
          ws.end(buffer);
        });
      });
    }).on('error', (e) => { clearTimeout(timeout); reject(e); })
      .connect({ host: NCP_HOST, port: 22, username: NCP_USER, password: NCP_PASSWORD, readyTimeout: 10_000 });
  });
}

async function main() {
  console.log('🖼️  Supabase Storage → NCP 썸네일 마이그레이션\n');

  // Supabase URL이 있는 프로젝트만
  const { rows } = await pool.query(`
    SELECT project_id, title, thumbnail_url
    FROM vibefolio.vf_projects
    WHERE thumbnail_url LIKE '%supabase.co%'
    ORDER BY project_id
  `);

  console.log(`마이그레이션 대상: ${rows.length}개\n`);

  let ok = 0, fail = 0;

  for (const row of rows) {
    const supabaseUrl = row.thumbnail_url;

    // 원본 파일명 추출 (예: 1768205445536-u618e6.jpg)
    const originalFilename = path.basename(supabaseUrl.split('?')[0]);
    const ext = path.extname(originalFilename) || '.jpg';
    const newFilename = originalFilename; // 동일한 파일명 유지

    process.stdout.write(`  #${row.project_id} "${row.title.slice(0,20)}"... `);

    try {
      // 1. Supabase에서 다운로드
      const buffer = await downloadBuffer(supabaseUrl);

      // 2. NCP에 업로드
      const newUrl = await uploadToNCP(buffer, 'projects/uploads', newFilename);

      // 3. DB 업데이트
      await pool.query(
        'UPDATE vibefolio.vf_projects SET thumbnail_url = $1 WHERE project_id = $2',
        [newUrl, row.project_id]
      );

      console.log(`✅ ${newUrl.split('/').pop()}`);
      ok++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      fail++;
    }

    // SSH 과부하 방지
    await new Promise(r => setTimeout(r, 300));
  }

  // content_text 안의 Supabase 이미지 URL도 처리 (인라인 이미지)
  console.log('\n📝 인라인 이미지 URL 업데이트 중...');
  const { rows: contentRows } = await pool.query(`
    SELECT project_id, content_text
    FROM vibefolio.vf_projects
    WHERE content_text LIKE '%ddnebvjjkxigxbmkqvzr.supabase.co%'
  `);

  for (const row of contentRows) {
    const newContent = row.content_text.replace(
      /https:\/\/ddnebvjjkxigxbmkqvzr\.supabase\.co\/storage\/v1\/object\/public\/projects\/uploads\//g,
      `${NCP_PUBLIC_URL}/projects/uploads/`
    );

    // content_text 안의 이미지들도 다운로드/업로드가 필요하지만 일단 URL만 교체
    if (newContent !== row.content_text) {
      await pool.query(
        'UPDATE vibefolio.vf_projects SET content_text = $1 WHERE project_id = $2',
        [newContent, row.project_id]
      );
      console.log(`  ✅ #${row.project_id} 인라인 URL 교체 완료`);
    }
  }

  console.log(`\n✅ 썸네일 완료: ${ok}개, 실패: ${fail}개`);
  await pool.end();
}

main().catch(e => { console.error('💥', e.message); process.exit(1); });
