// src/lib/db.ts — Prisma 싱글톤 클라이언트 (pg adapter)
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // DATABASE_URL의 ?schema= 파라미터를 pg Pool이 무시하므로
  // options 파라미터로 search_path를 직접 설정
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete('schema');
  url.searchParams.set('options', '-c search_path=vibefolio');

  const pool = new Pool({ connectionString: url.toString() });
  const adapter = new PrismaPg(pool, { schema: 'vibefolio' });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
