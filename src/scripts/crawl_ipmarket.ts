
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as process from 'process';
import { PrismaClient } from '@prisma/client';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

const TARGET_URL = 'https://www.ipmarket.or.kr/idearo/service/idc/chlg/idcMain.do';
const BASE_URL = 'https://www.ipmarket.or.kr';

async function crawl() {
  try {
    console.log(`Fetching ${TARGET_URL}...`);
    const { data } = await axios.get(TARGET_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.ipmarket.or.kr/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        },
        responseType: 'arraybuffer'
    });

    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(data);
    const $ = cheerio.load(html);

    const items: any[] = [];

    $('.cad_box_list .list > div').each((i, el) => {
        const $el = $(el);
        const titleRaw = $el.find('.text .title').text();
        const title = titleRaw.replace(/[\n\t]+/g, ' ').trim();

        if (!title) return;

        const organizerRaw = $el.find('.text .id').text();
        const organizer = organizerRaw.split('|')[0].trim();

        const dateStr = $el.find('.text .day').text().trim();

        const prizeraw = $el.find('.text2').text().replace(/[\n\t]+/g, '').trim();
        let prize = $el.find('.text2 > span:first-child').text().trim();
        if(!prize) prize = prizeraw.substring(0, 20);

        const href = $el.find('a.item').attr('href');
        let link = '';
        if (href && href.includes('goDetailPage')) {
            const match = href.match(/'([^']+)'/);
            if (match) {
                link = `${BASE_URL}/idearo/service/idc/chlg/idcDetail.do?idcManageId=${match[1]}`;
            }
        }

        let thumbnail = $el.find('.img img').attr('src');
        if (thumbnail && !thumbnail.startsWith('http')) {
            thumbnail = BASE_URL + thumbnail;
        }
        if (thumbnail?.includes('no_image')) thumbnail = undefined;

        const keywords = ['AI', '인공지능', '데이터', 'SW', '소프트웨어', '지능형', '로봇', '스마트', '디지털', '플랫폼', '기술'];
        const isAI = keywords.some(k => title.toUpperCase().includes(k) || title.includes(k));

        if (link && isAI) {
             items.push({
                 title,
                 description: `${organizer}에서 주관하는 아이디어 공모전입니다.`,
                 type: 'contest',
                 date: dateStr,
                 company: organizer,
                 prize,
                 link,
                 thumbnail,
                 is_approved: true,
                 is_active: true,
                 views_count: 0
             });
        }
    });

    console.log(`Found ${items.length} AI-related items.`);

    for (const item of items) {
        const existing = await prisma.vf_recruit_items.findFirst({
            where: { link: item.link },
            select: { id: true },
        });

        if (!existing) {
            await prisma.vf_recruit_items.create({
                data: {
                    title: item.title,
                    description: item.description,
                    type: item.type,
                    date: item.date,
                    company: item.company,
                    prize: item.prize,
                    link: item.link,
                    thumbnail: item.thumbnail,
                    is_approved: item.is_approved,
                    is_active: item.is_active,
                    views_count: item.views_count,
                },
            });
            console.log(`Inserted: ${item.title}`);
        } else {
            console.log(`Skipped (Duplicate): ${item.title}`);
        }
    }

  } catch (e: any) {
    console.error('Crawl failed:', e.message);
    if (e.response) console.error('Status:', e.response.status);
  } finally {
    await prisma.$disconnect();
  }
}

crawl();
