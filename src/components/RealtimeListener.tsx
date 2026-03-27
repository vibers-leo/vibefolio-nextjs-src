"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

// 알림 설정 인터페이스
export interface NotificationSettings {
  projects: boolean;
  recruit: boolean;
  likes: boolean;
  proposals: boolean;
  notices: boolean;
  adminInquiries: boolean;
  adminSignups: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  projects: true,
  recruit: true,
  likes: true,
  proposals: true,
  notices: true,
  adminInquiries: true,
  adminSignups: true,
};

/**
 * 실시간 DB 알림 리스너 — Supabase Realtime 제거, 폴링 기반
 * (실시간 알림은 useNotifications 훅에서 60초 폴링으로 대체)
 */
export default function RealtimeListener() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  // 설정 로드
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem("notification_settings");
      if (saved) {
        try {
          setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) });
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
    };

    loadSettings();
    window.addEventListener("storage", loadSettings);
    window.addEventListener("notificationSettingsChanged", loadSettings);

    return () => {
      window.removeEventListener("storage", loadSettings);
      window.removeEventListener("notificationSettingsChanged", loadSettings);
    };
  }, []);

  // Realtime 구독 제거됨 — useNotifications 훅에서 폴링으로 대체
  return null;
}
