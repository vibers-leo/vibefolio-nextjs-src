"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth, getToken } from "@/lib/auth/AuthContext";

export interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention" | "system";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  action_label?: string;
  action_url?: string;
  createdAt: string;
  sender?: {
    id: string;
    nickname: string;
    profileImage?: string;
  };
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => void;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

/**
 * 알림 훅 — API 폴링 기반 (Supabase Realtime 제거)
 */
export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/notifications?limit=50', {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();

      const formatted: Notification[] = (data.notifications || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        action_label: n.action_label,
        action_url: n.action_url,
        read: n.read,
        createdAt: n.created_at,
      }));

      setNotifications(formatted);
    } catch (error) {
      console.error("[Notifications] 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("[Notifications] 읽음 처리 실패:", error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error("[Notifications] 전체 읽음 처리 실패:", error);
    }
  }, [user]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // 초기 로드 + 60초 폴링
  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}

/**
 * 알림 생성 함수
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  senderId,
  actionLabel,
  actionUrl
}: {
  userId: string;
  type: Notification["type"];
  title: string;
  message: string;
  link?: string;
  senderId?: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  try {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type, title, message, link, senderId, actionLabel, actionUrl }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
  } catch (error) {
    console.error("[Notifications] 생성 실패:", error);
  }
}
