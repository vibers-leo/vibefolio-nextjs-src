
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as process from 'process';
import { PrismaClient } from '@prisma/client';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function addManualItem() {
  const item = {
     title: "모두의 아이디어 (아이디어로) - 전 국민 아이디어 공모 플랫폼",
     description: "한국발명진흥회가 운영하는 아이디어 거래 플랫폼 '아이디어로'. 기업, 기관의 과제에 도전하고 나만의 아이디어를 판매하세요.",
     type: 'contest',
     date: '2025-12-31',
     company: "한국발명진흥회",
     prize: "최대 수천만원 (과제별 상이)",
     link: "https://www.ipmarket.or.kr/idearo/index.do",
     thumbnail: "https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&q=80&w=800",
     is_approved: true,
     is_active: true,
     views_count: 0
  };

  const existing = await prisma.vf_recruit_items.findFirst({
      where: { link: item.link },
      select: { id: true },
  });

  if (existing) {
      console.log(`Updating existing item: ${item.title}`);
      await prisma.vf_recruit_items.update({
          where: { id: existing.id },
          data: {
              title: item.title,
              description: item.description,
              type: item.type,
              date: item.date,
              company: item.company,
              prize: item.prize,
              thumbnail: item.thumbnail,
              is_approved: item.is_approved,
              is_active: item.is_active,
          },
      });
      console.log(`Updated successfully.`);
  } else {
      console.log(`Inserting new item: ${item.title}`);
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
      console.log(`Inserted successfully.`);
  }

  await prisma.$disconnect();
}

addManualItem();
