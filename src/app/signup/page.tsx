"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { RiKakaoTalkFill } from "react-icons/ri";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     // 네이버 인앱 브라우저 감지 및 처리
     const userAgent = window.navigator.userAgent.toLowerCase();
     const isNaverApp = userAgent.includes('naver'); 
     
     if (isNaverApp) {
         toast.info("네이버 앱에서는 소셜 로그인이 제한될 수 있습니다.", {
              description: "원활한 로그인을 위해 크롬이나 사파리 등 기본 브라우저를 이용해주세요.",
              duration: 5000
         });
     }
  }, []);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.session) {
        // 이미 세션이 생성됨 (자동 로그인 설정인 경우)
        toast.success("회원가입이 완료되었습니다!");
        router.push("/");
      } else {
        // 이메일 확인 필요
        toast.success("회원가입 확인 이메일이 발송되었습니다!", {
          description: "이메일을 확인하여 계정을 활성화해주세요.",
          duration: 5000,
        });
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      console.error("[Signup] Error:", error);
      setError(error.message || "회원가입 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("[Signup] Google Error:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleKakaoSignup = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("[Signup] Kakao Error:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50/80 via-white to-emerald-50/20 relative overflow-hidden noise-overlay">
      {/* 배경 데코레이션 — Supanova 프리미엄 */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-green-100/20 to-transparent rounded-full blur-[120px] -ml-56 -mt-56" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-emerald-50/30 to-transparent rounded-full blur-[100px] -mr-40 -mb-40" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-radial from-green-100/10 to-transparent rounded-full blur-[80px]" />

      {/* 프리미엄 글래스 카드 */}
      <div className="w-full max-w-md space-y-7 bg-white/75 backdrop-blur-2xl backdrop-saturate-[1.6] p-8 md:p-10 rounded-[2rem] shadow-[0_8px_60px_-16px_rgba(22,163,74,0.08),0_24px_80px_-24px_rgba(0,0,0,0.06)] ring-1 ring-white/70 relative z-10">
        <div className="text-center">
          <span className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-green-500/10 text-green-600 inline-block mb-4">Get Started</span>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-snug break-keep">
            크리에이터로 시작하기
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-bold text-green-600 hover:text-green-700 transition-all duration-300 ease-supanova">
              로그인하기
            </Link>
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50/80 border border-red-200/60 text-red-600 px-4 py-3 rounded-xl text-sm font-medium backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* 소셜 회원가입 */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            variant="outline"
            className="w-full h-12 flex items-center justify-center gap-3 border-slate-200/80 hover:bg-slate-50 rounded-full transition-all duration-300 ease-supanova hover:shadow-md hover:scale-[1.01]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            ) : (
              <FontAwesomeIcon icon={faGoogle} className="w-5 h-5 text-red-500" />
            )}
            <span className="text-slate-700 font-medium">Google로 계속하기</span>
          </Button>
          <Button
            type="button"
            onClick={handleKakaoSignup}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 border-0 rounded-full transition-all duration-300 ease-supanova hover:shadow-md hover:brightness-95 hover:scale-[1.01]"
            style={{ backgroundColor: '#FEE500' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            ) : (
              <RiKakaoTalkFill className="w-5 h-5 text-[#191919]" />
            )}
            <span className="text-[#191919] font-medium">카카오로 계속하기</span>
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/60" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/80 px-4 text-slate-400 font-medium">또는</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignup}>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
              이메일
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-12 rounded-2xl bg-slate-50/60 border-slate-200/40 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-300 ease-supanova placeholder:text-slate-400"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="최소 6자 이상"
              className="h-12 rounded-2xl bg-slate-50/60 border-slate-200/40 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-300 ease-supanova placeholder:text-slate-400"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password-confirm" className="block text-sm font-semibold text-slate-700 mb-1.5">
              비밀번호 확인
            </label>
            <Input
              id="password-confirm"
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 다시 입력"
              className="h-12 rounded-2xl bg-slate-50/60 border-slate-200/40 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-300 ease-supanova placeholder:text-slate-400"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-13 rounded-full text-base font-bold bg-slate-900 hover:bg-black text-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.35)] transition-all duration-500 ease-supanova hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? "가입 중..." : "3초만에 가입하기"}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-400">
          <p>
            가입 시{" "}
            <Link href="/policy/terms" className="underline hover:text-slate-600 transition-colors">이용약관</Link> 및{" "}
            <Link href="/policy/privacy" className="underline hover:text-slate-600 transition-colors">개인정보처리방침</Link>에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
