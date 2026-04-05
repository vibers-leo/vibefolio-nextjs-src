// src/lib/db.ts — Prisma 싱글톤 클라이언트 (pg adapter)
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete('schema');
  url.searchParams.set('options', '-c search_path=vibefolio');

  const pool = new Pool({
    connectionString: url.toString(),
    max: 3,                    // 서버리스: 연결 수 최소화
    idleTimeoutMillis: 10000,  // 10초 idle 후 연결 해제
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool, { schema: 'vibefolio' });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// 개발/프로덕션 모두 globalThis에 저장 (인스턴스 재사용)
globalForPrisma.prisma = prisma;

export default prisma;
