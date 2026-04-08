/**
 * 앱 아이콘 생성기 — Playwright로 HTML 렌더링 후 PNG 캡처
 * 실행: node scripts/icon-generator.mjs
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'icons');
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── 아이콘 디자인 정의 ───────────────────────────────────────────────
const ICONS = [
  {
    name: 'monopage',
    html: `
      <div style="
        width:512px; height:512px;
        background: #0a0a0a;
        border-radius: 108px;
        display:flex; align-items:center; justify-content:center;
        font-family: 'Georgia', serif;
        position: relative;
        overflow: hidden;
      ">
        <!-- 배경 텍스처 미묘한 그리드 -->
        <div style="
          position:absolute; inset:0;
          background: radial-gradient(ellipse at 30% 30%, #1a1a1a 0%, #0a0a0a 70%);
        "></div>
        <!-- 가로 선 장식 -->
        <div style="
          position:absolute; top:50%; left:60px; right:60px; height:1px;
          background: rgba(255,255,255,0.06);
        "></div>
        <!-- M 레터마크 -->
        <span style="
          position:relative; z-index:1;
          font-size:260px; font-weight:400;
          color: #ffffff;
          letter-spacing: -8px;
          line-height:1;
          font-style: italic;
          text-shadow: 0 2px 40px rgba(255,255,255,0.1);
        ">M</span>
        <!-- 하단 미니 도트 -->
        <div style="
          position:absolute; bottom:72px; left:50%; transform:translateX(-50%);
          display:flex; gap:6px;
        ">
          <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.3)"></div>
          <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.15)"></div>
          <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.08)"></div>
        </div>
      </div>
    `,
    variants: ['dark'],
  },
];

// ─── Playwright 캡처 ─────────────────────────────────────────────────
async function generateIcon(browser, icon) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 512, height: 512 });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:512px; height:512px; overflow:hidden; background:transparent; }
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400&display=swap');
</style>
</head>
<body>
  ${icon.html}
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800); // 폰트 로딩 대기

  // 512×512 풀사이즈
  const fullPath = path.join(OUTPUT_DIR, `${icon.name}_512.png`);
  await page.screenshot({ path: fullPath, clip: { x:0, y:0, width:512, height:512 } });
  console.log(`  ✅ ${icon.name}_512.png`);

  // 140×140 (네이버 검수용)
  const smallPath = path.join(OUTPUT_DIR, `${icon.name}_140.png`);
  await page.screenshot({ path: smallPath, clip: { x:0, y:0, width:512, height:512 } });
  // sharp 없이 playwright clip으로 처리
  await page.setViewportSize({ width: 140, height: 140 });
  await page.evaluate(() => {
    document.body.style.transform = 'scale(0.273)';
    document.body.style.transformOrigin = 'top left';
  });
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${icon.name}_140.png`), clip: { x:0, y:0, width:140, height:140 } });
  console.log(`  ✅ ${icon.name}_140.png`);

  await page.close();
}

async function main() {
  console.log('🎨 아이콘 생성 시작...\n');
  const browser = await chromium.launch({ headless: true });

  for (const icon of ICONS) {
    console.log(`📱 [${icon.name}]`);
    await generateIcon(browser, icon);
  }

  await browser.close();
  console.log(`\n✅ 완료: ${OUTPUT_DIR}`);
}

main().catch(console.error);
