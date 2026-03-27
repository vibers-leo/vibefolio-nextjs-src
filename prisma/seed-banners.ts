/**
 * 배너 시드 데이터 — self-hosted PostgreSQL (NCP)
 * 실행: npx tsx prisma/seed-banners.ts
 */
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const banners = [
    {
      title: '당신의 사이드 프로젝트, 세상에 보여주세요',
      subtitle: 'VIBEFOLIO',
      image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=2670',
      link_url: '/project/upload',
      display_order: 0,
      is_active: true,
    },
    {
      title: '채용 & 공모전 정보를 한눈에',
      subtitle: 'RECRUIT',
      image_url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=2664&auto=format&fit=crop',
      link_url: '/recruit',
      display_order: 1,
      is_active: true,
    },
    {
      title: 'AI가 분석하는 내 포트폴리오',
      subtitle: 'AI REVIEW',
      image_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=2670',
      link_url: '/review',
      display_order: 2,
      is_active: true,
    },
  ];

  for (const banner of banners) {
    await prisma.banners.create({ data: banner });
  }

  console.log(`[seed] ${banners.length}개 배너 생성 완료`);
  await pool.end();
}

main().catch(console.error);
