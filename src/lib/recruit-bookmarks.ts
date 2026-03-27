// src/lib/recruit-bookmarks.ts — API 기반 (Supabase 제거)
import { getToken } from './auth/AuthContext';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function getUserRecruitBookmarks(userId: string): Promise<number[]> {
  try {
    const res = await fetch(`/api/recruit-items?bookmarksFor=${userId}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.bookmarks || [];
  } catch {
    return [];
  }
}

export async function toggleRecruitBookmark(itemId: number): Promise<boolean> {
  try {
    const res = await fetch('/api/recruit-items', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'toggleBookmark', itemId }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.bookmarked ?? false;
  } catch {
    return false;
  }
}
