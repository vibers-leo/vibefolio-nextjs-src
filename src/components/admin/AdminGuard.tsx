"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2, ShieldAlert } from "lucide-react";
import { isAdminEmail } from "@/lib/auth/admins";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAdmin, isLoading } = useAdmin();
  const [showContent, setShowContent] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);

  useEffect(() => {
    // 로딩 중이면 체크를 미룹니다.
    if (isLoading) return;

    if (isAdmin) {
      // 이미 관리자로 확인됨
      setShowContent(true);
      setDeniedEmail(null);
    } else {
      // 관리자가 아닐 경우, 이메일 기반 최종 확인 (DB 동기화 지연 방지)
      const verifyFinal = async () => {
        try {
          const { supabase } = await import("@/lib/supabase/client");
          const { data: { user } } = await supabase.auth.getUser();

          if (isAdminEmail(user?.email)) {
            setShowContent(true);
            setDeniedEmail(null);
          } else {
            setDeniedEmail(user?.email || "알 수 없는 계정");
          }
        } catch (err) {
          console.error("Admin verification error:", err);
          setDeniedEmail("시스템 오류가 발생했습니다.");
        }
      };

      verifyFinal();
    }
  }, [isAdmin, isLoading]);

  // 접근 거부 화면 (디자인 강화)
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

  // 로딩 화면 (디자인 강화)
  if (isLoading || !showContent) {
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
