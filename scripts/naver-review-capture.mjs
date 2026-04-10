/**
 * 네이버 로그인 검수 제출용 스크린샷 자동 캡처
 * 실행: node scripts/naver-review-capture.mjs
 * 결과: scripts/naver-review/{사이트명}/ 폴더에 저장
 *
 * 대상 사이트:
 *   - vibefolio.net  (네이버 앱명: 바이브폴리오)
 *   - myratingis.kr  (네이버 앱명: 제평가는요)
 *   - monopage.kr    (네이버 앱명: 모노페이지)
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_OUTPUT = path.join(__dirname, 'naver-review');

const SITES = [
  {
    name: 'vibefolio',
    domain: 'https://vibefolio.net',
    icon: '/vibefolio3.png',
    pages: [
      { name: 'login',  path: '/login',  waitFor: 'button' },
      { name: 'signup', path: '/signup', waitFor: 'button' },
    ],
  },
  {
    name: 'myratingis',
    domain: 'https://myratingis.kr',
    icon: '/myratingis-logo.png',
    pages: [
      { name: 'login',  path: '/login',  waitFor: 'button' },
      { name: 'signup', path: '/signup', waitFor: 'button' },
    ],
  },
  {
    name: 'monopage',
    domain: 'https://monopage.kr',
    icon: null,
    pages: [
      { name: 'login',  path: '/login',  waitFor: 'button' },
      { name: 'signup', path: '/signup', waitFor: 'button' },
    ],
  },
];

const VIEWPORTS = {
  pc:     { width: 1280, height: 800 },
  mobile: { width: 390,  height: 844, isMobile: true, deviceScaleFactor: 3 },
};

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function captureSite(browser, site) {
  const outputDir = path.join(BASE_OUTPUT, site.name);
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  console.log(`\n📂 [${site.name}] ${site.domain}`);
  let fileIndex = 1;

  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport:        { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor || 1,
      isMobile:        viewport.isMobile || false,
      userAgent:       viewport.isMobile ? MOBILE_UA : undefined,
    });

    for (const pageInfo of site.pages) {
      const page = await context.newPage();
      const url = `${site.domain}${pageInfo.path}`;
      console.log(`  📸 [${viewportName}] ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
        await page.waitForTimeout(1500);

        const filename = `${String(fileIndex).padStart(2, '0')}_${pageInfo.name}_${viewportName}.png`;
        await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
        console.log(`     ✅ ${filename}`);
        fileIndex++;
      } catch (err) {
        console.error(`     ❌ 실패: ${err.message}`);
      }

      await page.close();
    }

    await context.close();
  }

  // 서비스 아이콘 140×140
  if (site.icon) {
    console.log(`  📸 서비스 아이콘 캡처...`);
    const iconCtx = await browser.newContext({ viewport: { width: 200, height: 200 } });
    const iconPage = await iconCtx.newPage();
    try {
      await iconPage.goto(`${site.domain}${site.icon}`, { waitUntil: 'networkidle', timeout: 10000 });
      await iconPage.screenshot({
        path: path.join(outputDir, `${String(fileIndex).padStart(2, '0')}_service_icon_140x140.png`),
        fullPage: false,
        clip: { x: 0, y: 0, width: 140, height: 140 },
      });
      console.log(`     ✅ service_icon_140x140.png`);
    } catch (err) {
      console.error(`     ❌ 아이콘 캡처 실패: ${err.message}`);
    }
    await iconPage.close();
    await iconCtx.close();
  }
}

async function main() {
  if (!existsSync(BASE_OUTPUT)) mkdirSync(BASE_OUTPUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const site of SITES) {
    await captureSite(browser, site);
  }

  await browser.close();

  console.log('\n\n🎉 모든 캡처 완료!');
  console.log('📁 저장 위치: scripts/naver-review/\n');

  for (const site of SITES) {
    console.log(`── ${site.name}/ (${site.domain})`);
    let i = 1;
    for (const vp of Object.keys(VIEWPORTS)) {
      for (const p of site.pages) {
        console.log(`   ${String(i).padStart(2,'0')}_${p.name}_${vp}.png`);
        i++;
      }
    }
    if (site.icon) console.log(`   ${String(i).padStart(2,'0')}_service_icon_140x140.png`);
  }

  console.log('\n📋 검수 신청: https://developers.naver.com/apps/#/list');
}

main().catch(console.error);
