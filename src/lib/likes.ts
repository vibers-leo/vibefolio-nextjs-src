// src/lib/likes.ts — API 기반 (Supabase 제거)
import { getToken } from './auth/AuthContext';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function getUserLikes(userId: string) {
  try {
    const res = await fetch(`/api/likes?userId=${userId}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.likes || []).map((l: any) => l.project_id);
  } catch {
    return [];
  }
}

export async function isProjectLiked(projectId: string | number): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  // me에서 userId 가져오기 대신, 서버에서 처리
  return false; // 클라이언트에서는 GET /api/likes?userId=...&projectId=... 로 확인
}

export async function toggleLike(projectId: string | number): Promise<boolean> {
  try {
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ projectId: Number(projectId) }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.liked;
  } catch {
    return false;
  }
}

export async function getProjectLikeCount(projectId: string | number): Promise<number> {
  try {
    const res = await fetch(`/api/likes?projectId=${projectId}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || 0;
  } catch {
    return 0;
  }
}
