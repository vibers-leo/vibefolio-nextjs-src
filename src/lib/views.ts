// src/lib/views.ts — API 기반 (Supabase 제거)
import { getToken } from './auth/AuthContext';

/**
 * 프로젝트 조회 기록 (서버에서 자동으로 처리하므로 빈 구현)
 */
export async function recordView(projectId: string | number): Promise<void> {
  // GET /api/projects/[id] 에서 자동 조회수 증가
}

/**
 * 프로젝트 조회수 조회
 */
export async function getProjectViewCount(projectId: string | number): Promise<number> {
  try {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.project?.views_count || 0;
  } catch {
    return 0;
  }
}
