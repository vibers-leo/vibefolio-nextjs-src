"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Briefcase } from "lucide-react";
import Link from "next/link";

export default function RecruitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Recruit] Error:", error);
  }, [error]);

  const handleRetry = () => {
    if (error.message?.includes("chunk")) {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="space-y-4 max-w-md text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
          <Briefcase size={28} className="text-blue-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900">연결하기 페이지 오류</h2>
        <p className="text-gray-500">채용/공모전 정보를 불러오는 중 오류가 발생했습니다.</p>

        <div className="flex gap-3 justify-center pt-2">
          <Button
            onClick={handleRetry}
            className="rounded-xl bg-slate-900 hover:bg-slate-800"
          >
            <RefreshCcw size={16} className="mr-2" /> 다시 시도
          </Button>
          <Link href="/">
            <Button variant="outline" className="rounded-xl">
              홈으로
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
