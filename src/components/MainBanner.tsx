"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Skeleton,
} from "@/components/ui/index";
import Link from "next/link";
import React from "react";
import Image from "next/image";

interface ContestItem {
  id?: number;
  title: string;
  description?: string | null;
  date?: string | null;
  company?: string | null;
  link?: string | null;
  thumbnail?: string | null;
  prize?: string | null;
  type?: string;
}

function getDday(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '마감';
  if (diff === 0) return 'D-Day';
  return `D-${diff}`;
}

function getDdayColor(dateStr: string | null | undefined): string {
  if (!dateStr) return 'bg-white/20';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 3) return 'bg-red-500/90';
  if (diff <= 7) return 'bg-orange-500/80';
  return 'bg-white/20';
}

interface MainBannerProps {
  initialContests?: ContestItem[];
}

export function MainBanner({ initialContests }: MainBannerProps = {}) {
  const contests = initialContests && initialContests.length > 0 ? initialContests : [];

  if (contests.length === 0) return null;

  return (
    <section className="w-full pt-6 pb-2">
      <div className="flex items-center justify-between px-4 md:px-6 mb-3">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          공모전 · 해커톤
        </h2>
        <Link
          href="/recruit?type=contest"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          전체보기 →
        </Link>
      </div>
      <Carousel
        opts={{
          align: "start",
          loop: contests.length > 2,
        }}
        className="w-full"
      >
        <CarouselContent className="w-full flex justify-start gap-0 -ml-0">
          {contests.map((contest, index) => (
            <CarouselItem
              key={contest.id || index}
              className="basis-[85%] md:basis-[45%] lg:basis-[35%] pl-2 md:pl-4 first:pl-4 md:first:pl-6"
            >
              <Link
                href={contest.link || '/recruit'}
                target={contest.link?.startsWith('http') ? '_blank' : undefined}
                rel={contest.link?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                <div className="w-full aspect-[2/1] overflow-hidden rounded-2xl relative group isolate shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-all duration-500 hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] hover:scale-[1.01] active:scale-[0.99]">
                  {/* 배경 이미지 */}
                  <div className="absolute inset-0 z-0">
                    {contest.thumbnail ? (
                      <Image
                        src={contest.thumbnail}
                        alt={contest.title}
                        fill
                        className="object-cover transition-all duration-700 group-hover:scale-[1.06]"
                        sizes="(max-width: 768px) 85vw, (max-width: 1200px) 45vw, 35vw"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-950" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  </div>

                  {/* 콘텐츠 */}
                  <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-10 flex flex-col items-start justify-end h-full">
                    {/* D-day 배지 */}
                    <div className="flex items-center gap-2 mb-2">
                      {contest.date && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white backdrop-blur-xl border border-white/20 ${getDdayColor(contest.date)}`}>
                          {getDday(contest.date)}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white/80 bg-white/10 backdrop-blur-xl border border-white/10">
                        {contest.type === 'event' ? 'EVENT' : 'CONTEST'}
                      </span>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-[clamp(0.9rem,2vw,1.25rem)] font-bold text-white leading-snug tracking-tight line-clamp-2 break-keep" style={{ textWrap: 'balance' } as React.CSSProperties}>
                      {contest.title}
                    </h3>

                    {/* 마감일 + 주최 */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                      {contest.date && (
                        <span>마감 {contest.date}</span>
                      )}
                      {contest.company && (
                        <span className="truncate max-w-[120px]">{contest.company}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        {contests.length > 2 && (
          <>
            <CarouselPrevious className="left-8 w-10 h-10 rounded-full border-none bg-white/10 hover:bg-white/25 backdrop-blur-xl text-white hidden md:flex shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-105" />
            <CarouselNext className="right-8 w-10 h-10 rounded-full border-none bg-white/10 hover:bg-white/25 backdrop-blur-xl text-white hidden md:flex shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-105" />
          </>
        )}
      </Carousel>
    </section>
  );
}

export default MainBanner;
