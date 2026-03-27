// src/lib/comments.ts — API 기반 (Supabase 제거)
import { getToken } from './auth/AuthContext';

export interface Comment {
  id: string;
  project_id: number;
  user_id: string;
  content: string;
  createdAt: string;
  username: string;
  userAvatar: string;
  isSecret?: boolean;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function getProjectComments(projectId: string | number): Promise<Comment[]> {
  try {
    const res = await fetch(`/api/comments?projectId=${projectId}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.comments || []).map((c: any) => ({
      id: String(c.comment_id),
      project_id: c.project_id,
      user_id: c.user_id,
      content: c.content,
      createdAt: c.created_at,
      username: c.user?.username || 'Unknown',
      userAvatar: c.user?.profile_image_url || '/globe.svg',
      isSecret: c.is_secret,
    }));
  } catch {
    return [];
  }
}

export async function addComment(
  projectId: string | number,
  userId: string,
  content: string,
  username: string,
  avatarUrl: string,
  isSecret: boolean = false
): Promise<Comment | null> {
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ projectId: Number(projectId), content, isSecret }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.comment;
    if (!c) return null;
    return {
      id: String(c.comment_id),
      project_id: c.project_id,
      user_id: c.user_id,
      content: c.content,
      createdAt: c.created_at,
      username: c.user?.username || username,
      userAvatar: c.user?.profile_image_url || avatarUrl,
      isSecret: c.is_secret,
    };
  } catch {
    return null;
  }
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  await fetch(`/api/comments?commentId=${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function getCommentCount(projectId: string | number): Promise<number> {
  try {
    const comments = await getProjectComments(projectId);
    return comments.length;
  } catch {
    return 0;
  }
}
