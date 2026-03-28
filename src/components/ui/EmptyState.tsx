"use client";

import { FontAwesomeIcon } from "@/components/FaIcon";
import { faMagnifyingGlass, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionLink?: string;
  icon?: "search" | "folder";
}

export function EmptyState({
  title = "데이터가 없습니다",
  description = "조건에 맞는 결과를 찾을 수 없습니다.",
  actionLabel,
  actionLink,
  icon = "folder"
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 md:py-32 px-4 text-center rounded-[2rem] bg-gradient-to-br from-slate-50/80 via-white to-slate-50/60 ring-1 ring-black/[0.04] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] relative overflow-hidden">
      {/* 배경 데코 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-50/40 to-transparent rounded-full blur-[80px] -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-50/30 to-transparent rounded-full blur-[60px] -ml-12 -mb-12" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_4px_24px_-8px_rgba(22,163,74,0.1)] ring-1 ring-black/[0.04] mb-8">
          {icon === "search" ? (
            <FontAwesomeIcon icon={faMagnifyingGlass} className="w-8 h-8 text-slate-300" />
          ) : (
            <FontAwesomeIcon icon={faFolderOpen} className="w-8 h-8 text-slate-300" />
          )}
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight break-keep">{title}</h3>
        <p className="text-slate-400 mb-10 max-w-sm mx-auto text-[15px] leading-relaxed break-keep">{description}</p>

        {actionLabel && actionLink && (
          <Button asChild className="rounded-full bg-slate-900 hover:bg-black text-white px-8 py-4 h-auto font-bold text-[15px] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.3)] transition-all duration-500 ease-supanova hover:scale-[1.02] active:scale-[0.98]">
            <Link href={actionLink}>{actionLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
