// src/lib/versions.ts — API 기반 (클라이언트에서 사용 가능)
import { getToken } from './auth/AuthContext';

export interface ProjectVersion {
  id: number;
  project_id: number;
  version_name: string;
  changelog: string | null;
  content_html?: string | null;
  content_text?: string | null;
  images?: string[] | null;
  created_at: string;
}

export async function getProjectVersions(projectId: string | number): Promise<ProjectVersion[]> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api/projects/${projectId}/versions`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.versions || [];
  } catch (error) {
    console.error("Error fetching project versions:", error);
    return [];
  }
}
