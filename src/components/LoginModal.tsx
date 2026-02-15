"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string; // 로그인 후 돌아갈 URL
  message?: string; // 사용자에게 보여줄 메시지
}

export function LoginModal({ open, onOpenChange, returnTo, message }: LoginModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const redirectUrl = returnTo || window.location.pathname;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
          queryParams: {
            access_type: 'offline',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google 로그인 오류:", error);
      toast.error("Google 로그인 실패", { description: error.message });
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      setIsLoading(true);
      const redirectUrl = returnTo || window.location.pathname;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("카카오 로그인 오류:", error);
      toast.error("카카오 로그인 실패", { description: error.message });
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        toast.success("로그인 성공!");
        onOpenChange(false);
        // 페이지 새로고침하여 인증 상태 반영
        window.location.reload();
      }
    } catch (error: any) {
      console.error("로그인 오류:", error);
      toast.error("로그인 실패", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupRedirect = () => {
    const redirectUrl = returnTo || window.location.pathname;
    router.push(`/signup?returnTo=${encodeURIComponent(redirectUrl)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {message || "로그인이 필요해요!"}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            무료로 가입하고 더 많은 기능을 이용하세요
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Google 로그인 버튼 */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 h-12 text-base font-medium"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            ) : (
              <>
                <FcGoogle className="h-5 w-5 mr-2" />
                Google 계정으로 3초 만에 시작
              </>
            )}
          </Button>

          {/* 카카오 로그인 버튼 */}
          <Button
            onClick={handleKakaoLogin}
            disabled={isLoading}
            className="w-full border-0 text-[#191919] hover:brightness-95 h-12 text-base font-medium"
            style={{ backgroundColor: '#FEE500' }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            ) : (
              <>
                <RiKakaoTalkFill className="h-5 w-5 mr-2" />
                카카오 계정으로 3초 만에 시작
              </>
            )}
          </Button>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">또는</span>
            </div>
          </div>

          {/* 이메일 로그인 토글 */}
          {!showEmailForm ? (
            <Button
              onClick={() => setShowEmailForm(true)}
              variant="outline"
              className="w-full"
            >
              이메일로 로그인
            </Button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <Input
                type="email"
                placeholder="이메일"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
              />
              <Input
                type="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          )}

          {/* 회원가입 링크 */}
          <div className="text-center text-sm text-gray-600">
            계정이 없으신가요?{" "}
            <button
              onClick={handleSignupRedirect}
              className="font-medium text-green-600 hover:text-green-700 hover:underline"
            >
              무료 회원가입
            </button>
          </div>

          {/* 혜택 안내 */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 mt-2">
            <p className="text-sm font-bold text-green-900 mb-2">회원 가입하면</p>
            <ul className="text-xs text-green-800 space-y-1">
              <li>✅ 좋아요 & 북마크 무제한</li>
              <li>✅ 프로젝트 업로드 & 피드백 받기</li>
              <li>✅ AI 창작자 커뮤니티 참여</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
