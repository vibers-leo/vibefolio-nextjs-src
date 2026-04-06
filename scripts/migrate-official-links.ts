// scripts/migrate-official-links.ts
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

/**
 * "25.12.31" 또는 "2025-12-31" 형태의 날짜를 "YYYY-MM-DD"로 변환
 */
function formatDateString(str: string): string {
  if (!str) return str;
  const cleaned = str.replace(/[^\d.]/g, '').replace(/^\.+|\.+$/g, '');
  const parts = cleaned.split('.');

  let year, month, day;

  if (parts.length === 3) {
    year = parts[0];
    month = parts[1].padStart(2, '0');
    day = parts[2].padStart(2, '0');
    if (year.length === 2) year = '20' + year;
  } else if (parts.length === 2) {
    const now = new Date();
    const currentYear = now.getFullYear();
    month = parts[0].padStart(2, '0');
    day = parts[1].padStart(2, '0');
    year = currentYear.toString();
    const testDate = new Date(`${year}-${month}-${day}`);
    if (testDate.getTime() < now.getTime() - (1000 * 60 * 60 * 24 * 90)) {
       if (now.getMonth() < 3 && parseInt(month) > 9) {
         year = (currentYear - 1).toString();
       }
    }
  } else {
    return str;
  }

  return `${year}-${month}-${day}`;
}

async function fetchDetailInfo(detailUrl: string): Promise<any> {
  try {
    const res = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    const $ = cheerio.load(html);

    let officialUrl = $('.contest-detail .btn-area a:contains("홈페이지 바로가기")').attr('href') ||
                      $('.contest-detail-info a:contains("홈페이지 바로가기")').attr('href') ||
                      $('.contest-detail .btn-area a:contains("상세보기")').attr('href') ||
                      $('.contest-detail .btn-area a:contains("지원하기")').attr('href') ||
                      $('.contest-detail .btn-area a:contains("공식")').attr('href') ||
                      $('a:contains("홈페이지")').filter((_, el) => $(el).text().includes('바로가기')).attr('href');

    const info: any = { officialLink: officialUrl };
    $('.contest-detail-info li').each((_, el) => {
      const rawText = $(el).text().replace(/\s+/g, ' ').trim();
      const extractValue = (label: string) => {
        if (rawText.includes(label)) {
          return rawText.split(label)[1]?.replace(/^[:\s]+/, '').trim();
        }
        return null;
      };

      const category = extractValue('분야'); if (category) info.categoryTags = category;
      const target = extractValue('대상'); if (target) info.applicationTarget = target;
      const host = extractValue('주최/주관'); if (host) info.company = host;
      const sponsor = extractValue('후원/협찬'); if (sponsor) info.sponsor = sponsor;
      const totalP = extractValue('총 상금'); if (totalP) info.totalPrize = totalP;
      const firstP = extractValue('1등 상금'); if (firstP) info.firstPrize = firstP;

      const awardDetail = extractValue('시상내역') || extractValue('상금');
      if (awardDetail) info.prize = awardDetail;

      if (rawText.includes('접수기간')) {
        const period = extractValue('접수기간');
        if (period && period.includes('~')) {
          const startPart = period.split('~')[0].trim();
          info.startDate = formatDateString(startPart);
          const endPart = period.split('~')[1].trim();
          info.date = formatDateString(endPart);
        }
      }
    });

    const posterImg = $('.thumb img').attr('src');
    if (posterImg) {
      info.image = posterImg.startsWith('http') ? posterImg : `https://www.wevity.com${posterImg.startsWith('/') ? '' : '/'}${posterImg}`;
    }

    return info;
  } catch (e) {
    return undefined;
  }
}

async function migrate() {
  console.log('Fetching items to upgrade (Recruit Items)...');

  const recruitItems = await prisma.vf_recruit_items.findMany({
    where: { type: 'contest' },
  });

  console.log(`Found ${recruitItems.length} recruit items to process.`);
  for (const item of recruitItems) {
    console.log(`Processing Recruit Item: [${item.id}] ${item.title}`);
    const sourceLink = item.source_link || item.link;
    if (!sourceLink) continue;

    const detail = await fetchDetailInfo(sourceLink);

    if (detail) {
      await prisma.vf_recruit_items.update({
        where: { id: item.id },
        data: {
          link: detail.officialLink || item.link,
          source_link: sourceLink,
          thumbnail: detail.image || item.thumbnail,
          application_target: detail.applicationTarget || item.application_target,
          sponsor: detail.sponsor || item.sponsor,
          total_prize: detail.totalPrize || item.total_prize,
          first_prize: detail.firstPrize || item.first_prize,
          prize: detail.prize || detail.totalPrize || item.prize,
          start_date: detail.startDate || item.start_date,
          date: detail.date || item.date,
          category_tags: detail.categoryTags || item.category_tags,
          company: detail.company || item.company,
        },
      });
      console.log(`Updated recruit item ${item.id}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('Data migration completed.');
  await prisma.$disconnect();
}

migrate();
