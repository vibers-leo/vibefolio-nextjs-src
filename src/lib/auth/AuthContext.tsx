"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { isAdminEmail } from "./admins";

const IS_DEV = process.env.NODE_ENV === 'development';
const TOKEN_KEY = 'vf_token';

interface UserData {
  id: string;
  email: string;
  nickname?: string;
  username?: string;
  profile_image_url?: string;
  role?: string;
  points?: number;
  interests?: any;
  expertise?: any;
  google_id?: string | null;
  kakao_id?: string | null;
  naver_id?: string | null;
  has_password?: boolean;
}

interface UserProfile {
  username: string;
  profile_image_url: string;
  role: string;
  points?: number;
  interests?: {
    genres: string[];
    fields: string[];
  };
  expertise?: {
    fields: string[];
  };
}

interface AuthContextType {
  user: UserData | null;
  session: { access_token: string } | null;
  loading: boolean;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const initializedRef = useRef(false);
  const router = useRouter();

  // ====== 토큰으로 유저 정보 조회 ======
  const fetchMe = useCallback(async (t: string): Promise<UserData | null> => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  }, []);

  // ====== 상태 업데이트 ======
  const updateState = useCallback((u: UserData | null, t: string | null) => {
    setUser(u);
    setToken(t);

    if (u) {
      const profile: UserProfile = {
        username: u.username || u.nickname || u.email?.split("@")[0] || "User",
        profile_image_url: u.profile_image_url || "/globe.svg",
        role: u.role || "user",
        points: u.points || 0,
        interests: u.interests || undefined,
        expertise: u.expertise || undefined,
      };
      setUserProfile(profile);
    } else {
      setUserProfile(null);
    }

    setLoading(false);
  }, []);

  // ====== 초기화 ======
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!savedToken) {
      setLoading(false);
      return;
    }

    fetchMe(savedToken).then((u) => {
      if (u) {
        updateState(u, savedToken);
      } else {
        // 토큰 만료 또는 무효
        localStorage.removeItem(TOKEN_KEY);
        setLoading(false);
      }
    });
  }, [fetchMe, updateState]);

  const signOut = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
    setUserProfile(null);
    router.push("/login");
  }, [router]);

  const refreshUserProfile = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) return;
    const u = await fetchMe(savedToken);
    if (u) updateState(u, savedToken);
  }, [fetchMe, updateState]);

  // ====== 권한 체크 ======
  const isAdminUser = React.useMemo(() => {
    const emailCheck = isAdminEmail(user?.email);
    const roleCheck = userProfile?.role === "admin";
    const isMatched = emailCheck || roleCheck;

    if (IS_DEV && user) {
       console.log(`[Auth] Admin Check:`, {
         email: user.email,
         emailInWhitelist: emailCheck,
         profileRole: userProfile?.role,
         finalResult: isMatched ? 'ADMIN' : 'USER'
       });
    }

    return isMatched;
  }, [user, userProfile]);

  const session = React.useMemo(() => {
    return token ? { access_token: token } : null;
  }, [token]);

  const authValue = React.useMemo(() => ({
    user,
    session,
    loading,
    isAuthenticated: !!user,
    userProfile,
    isAdmin: isAdminUser,
    signOut,
    refreshUserProfile
  }), [user, session, loading, userProfile, isAdminUser, signOut, refreshUserProfile]);

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

/**
 * 토큰 저장 (로그인/회원가입 시 호출)
 */
export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 저장된 토큰 가져오기
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
