// src/lib/inquiries.ts — API 기반 (Supabase 제거)
import { getToken } from './auth/AuthContext';

export interface Inquiry {
  id: number;
  project_id: string;
  creator_id: string;
  user_id: string;
  message: string;
  created_at: string;
  status: "pending" | "answered";
  projects: {
    title: string;
    users: {
      username: string;
    };
  };
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function getUserInquiries(userId: string): Promise<Inquiry[]> {
  try {
    const res = await fetch(`/api/inquiries?userId=${userId}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.inquiries || [];
  } catch {
    return [];
  }
}

export async function addInquiry(
  projectId: string,
  creatorId: string,
  userId: string,
  message: string
): Promise<Inquiry | null> {
  try {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ projectId, creatorId, userId, message }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.inquiry || null;
  } catch {
    return null;
  }
}

export async function deleteInquiry(inquiryId: number, userId: string) {
  await fetch(`/api/inquiries?inquiryId=${inquiryId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return { data: null, error: null };
}

export async function getAllInquiries(): Promise<Inquiry[]> {
  try {
    const res = await fetch('/api/inquiries?all=true', { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.inquiries || [];
  } catch {
    return [];
  }
}

export async function updateInquiryStatus(
  inquiryId: number,
  status: "pending" | "answered"
): Promise<Inquiry | null> {
  try {
    const res = await fetch('/api/inquiries', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ inquiryId, status }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.inquiry || null;
  } catch {
    return null;
  }
}
