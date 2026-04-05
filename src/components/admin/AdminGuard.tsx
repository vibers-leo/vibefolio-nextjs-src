"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Loader2, ShieldAlert, LogIn } from "lucide-react";
import { isAdminEmail } from "@/lib/auth/admins";

const IS_DEV = process.env.NODE_ENV === 'development';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAdmin, loading, user, isAuthenticated } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (IS_DEV) console.log("[AdminGuard] State:", { isAdmin, loading, isAuthenticated, email: user?.email });

    if (loading) return;

    // 1. 로그인 안 된 경우 → 로그인 페이지 안내
    if (!isAuthenticated || !user) {
      if (IS_DEV) console.log("[AdminGuard] Not logged in → show login prompt");
      setNotLoggedIn(true);
      setDeniedEmail(null);
      setShowContent(false);
      return;
    }

    // 2. 로그인 + 관리자 → 바로 접근 허용
    if (isAdmin) {
      if (IS_DEV) console.log("[AdminGuard] Admin verified via AuthContext");
      setShowContent(true);
      setDeniedEmail(null);
      setNotLoggedIn(false);
      return;
    }

    // 3. AuthContext에서 아직 admin이 아닌 경우 → Supabase 직접 재확인 (fallback)
    const verifyFinal = async () => {
      if (IS_DEV) console.log("[AdminGuard] Fallback: direct Supabase check");
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const { data: { user: freshUser } } = await supabase.auth.getUser();

        if (isAdminEmail(freshUser)) {
          if (IS_DEV) console.log("[AdminGuard] Fallback → Admin confirmed");
          setShowContent(true);
          setDeniedEmail(null);
        } else {
          if (IS_DEV) console.log("[AdminGuard] Fallback → Access denied");
          setDeniedEmail(freshUser?.email || user?.email || "알 수 없는 계정");
        }
      } catch (err) {
        console.error("[AdminGuard] Fallback error:", err);
        setDeniedEmail(user?.email || "시스템 오류");
      }
    };

    verifyFinal();
  }, [isAdmin, loading, isAuthenticated, user]);

  // 안전장치: 로딩이 15초 이상 지속되면 타임아웃 처리
  useEffect(() => {
    if (loading || (!showContent && !deniedEmail && !notLoggedIn)) {
      timeoutRef.current = setTimeout(() => {
        if (!showContent && !deniedEmail && !notLoggedIn) {
          console.warn("[AdminGuard] Timeout: forcing login prompt");
          setNotLoggedIn(true);
        }
      }, 15000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loading, showContent, deniedEmail, notLoggedIn]);

  // 비로그인 화면
  if (notLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-blue-50 p-10 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <LogIn size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">로그인이 필요합니다</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            관리자 페이지에 접근하려면<br/>먼저 로그인해 주세요.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full h-14 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl active:scale-95 mb-3"
          >
            로그인하기
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full h-12 bg-slate-100 text-slate-600 rounded-2xl font-medium hover:bg-slate-200 transition-all"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 접근 거부 화면
  if (deniedEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-red-50 p-10 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">접근 권한이 없습니다</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            죄송합니다. 이곳은 관리자만 진입할 수 있는 서비스 핵심 제어 센터입니다.<br/>
            로그인된 계정: <span className="text-red-600 font-bold underline decoration-red-200 underline-offset-4">{deniedEmail}</span>
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            메인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 로딩 화면
  if (loading || !showContent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin relative z-10" />
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-slate-900 tracking-tight italic">VIBEFOLIO ADMIN</p>
          <p className="text-slate-400 font-medium mt-1">보안 연결 및 관리자 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // 관리자일 경우 콘텐츠 노출
  return <>{children}</>;
}
