// src/lib/bookmarks.ts — API 기반 (Supabase 제거)
import { getToken } from './auth/AuthContext';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function getUserBookmarks(userId: string) {
  try {
    const res = await fetch(`/api/wishlists?userId=${userId}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.wishlists || []).map((w: any) => w.project_id);
  } catch {
    return [];
  }
}

export async function isProjectBookmarked(projectId: string | number): Promise<boolean> {
  return false; // 서버에서 확인
}

export async function addBookmark(projectId: string | number): Promise<void> {
  await fetch('/api/wishlists', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ projectId: Number(projectId) }),
  });
}

export async function removeBookmark(projectId: string | number): Promise<void> {
  await fetch(`/api/wishlists?projectId=${projectId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function toggleBookmark(projectId: string | number): Promise<boolean> {
  try {
    const res = await fetch('/api/wishlists', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ projectId: Number(projectId), toggle: true }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.bookmarked ?? false;
  } catch {
    return false;
  }
}
