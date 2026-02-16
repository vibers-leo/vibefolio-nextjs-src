"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Shield } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    console.error("[Admin] Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="space-y-4 max-w-md text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
          <Shield size={28} className="text-red-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900">관리자 페이지 오류</h2>
        <p className="text-gray-500">관리자 페이지를 불러오는 중 오류가 발생했습니다.</p>

        <div className="flex gap-3 justify-center pt-2">
          <Button
            onClick={() => reset()}
            className="rounded-xl bg-slate-900 hover:bg-slate-800"
          >
            <RefreshCcw size={16} className="mr-2" /> 다시 시도
          </Button>
          <Link href="/admin">
            <Button variant="outline" className="rounded-xl">
              관리자 홈
            </Button>
          </Link>
        </div>

        {isDev && (
          <div className="pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              {showDetails ? "에러 상세 닫기" : "에러 상세 보기"}
            </button>
            {showDetails && (
              <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-left text-xs overflow-auto max-h-40">
                {error.message}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
