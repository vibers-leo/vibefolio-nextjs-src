"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";
import { SiNaver } from "react-icons/si";
import { toast } from "sonner";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // OAuth 콜백: URL에 token 파라미터가 있으면 저장 후 리다이렉트
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("vf_token", token);
      toast.success("로그인 성공!");
      const returnTo = searchParams.get("returnTo") || "/";
      router.replace(returnTo);
      return;
    }

    const errorParam = searchParams.get("error");
    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      setError(decodedError);
      toast.error("로그인 오류", { description: decodedError });
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "로그인 중 오류가 발생했습니다.");

      localStorage.setItem("vf_token", data.token);
      toast.success("로그인 성공!");
      const returnTo = searchParams.get("returnTo") || "/";
      router.push(returnTo);
    } catch (error: any) {
      console.error("로그인 오류:", error);
      setError(error.message || "로그인 중 오류가 발생했습니다.");
      toast.error("로그인 실패", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleKakaoLogin = () => {
    window.location.href = "/api/auth/kakao";
  };

  const handleNaverLogin = () => {
    window.location.href = "/api/auth/naver";
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50/80 via-white to-indigo-50/20 relative overflow-hidden noise-overlay">
      {/* 배경 데코레이션 — Supanova 프리미엄 */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-indigo-100/25 to-transparent rounded-full blur-[140px] -mr-72 -mt-72" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-violet-50/30 to-transparent rounded-full blur-[100px] -ml-40 -mb-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-radial from-indigo-100/10 to-transparent rounded-full blur-[80px]" />

      {/* 프리미엄 글래스 카드 */}
      <div className="w-full max-w-md space-y-8 bg-white/75 backdrop-blur-2xl backdrop-saturate-[1.6] p-8 md:p-10 rounded-[2rem] shadow-[0_8px_60px_-16px_rgba(79,70,229,0.08),0_24px_80px_-24px_rgba(0,0,0,0.06)] ring-1 ring-white/70 relative z-10">
        <div className="text-center">
          <span className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-indigo-500/10 text-indigo-600 inline-block mb-4">Welcome Back</span>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-snug break-keep">
            다시 만나서 반가워요
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            계정이 없으신가요?{" "}
            <Link
              href="/signup"
              className="font-bold text-indigo-600 hover:text-indigo-700 transition-all duration-300 ease-supanova"
            >
              회원가입
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50/80 border border-red-200/60 text-red-700 px-4 py-3 rounded-xl text-sm break-words backdrop-blur-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                이메일 주소
              </label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="example@email.com"
                className="h-12 rounded-2xl bg-slate-50/60 border-slate-200/40 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-300 ease-supanova placeholder:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                비밀번호
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="비밀번호"
                className="h-12 rounded-2xl bg-slate-50/60 border-slate-200/40 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-300 ease-supanova placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-slate-600"
              >
                로그인 상태 유지
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                비밀번호 찾기
              </Link>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-[15px] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.35)] transition-all duration-500 ease-supanova hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/60" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/80 px-4 text-slate-400 font-medium">또는</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 rounded-full font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-supanova hover:scale-[1.01]"
          >
            <FcGoogle className="h-5 w-5 mr-2.5" />
            Google 계정으로 로그인
          </Button>
          <Button
            onClick={handleKakaoLogin}
            className="w-full h-12 border-0 text-[#191919] hover:brightness-95 rounded-full font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-supanova hover:scale-[1.01]"
            style={{ backgroundColor: '#FEE500' }}
          >
            <RiKakaoTalkFill className="h-5 w-5 mr-2.5" />
            카카오 계정으로 로그인
          </Button>
          <Button
            onClick={handleNaverLogin}
            className="w-full h-12 border-0 text-white hover:brightness-95 rounded-full font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-supanova hover:scale-[1.01]"
            style={{ backgroundColor: '#03C75A' }}
          >
            <SiNaver className="h-4 w-4 mr-2.5" />
            네이버 계정으로 로그인
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  );
}
