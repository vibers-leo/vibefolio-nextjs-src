"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Skeleton,
} from "@/components/ui/index";
import Link from "next/link";

import Image from "next/image";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
}

// 폴백 배너 (DB에 데이터 없을 때)
const FALLBACK_BANNERS: Banner[] = [
  {
    id: "fallback-0",
    title: "2024 Generative AI Hackathon",
    subtitle: "PREMIUM CONTEST",
    image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=2670",
    link_url: "/recruit",
    display_order: 0,
  },
  {
    id: "fallback-1",
    title: "Creative Tech",
    subtitle: "EVENT",
    image_url: "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=2664&auto=format&fit=crop",
    link_url: "/recruit",
    display_order: 1,
  },
];

export function MainBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 캐시 확인 함수
    const checkCache = () => {
      try {
        const cached = localStorage.getItem("main_banners_cache");
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // 1시간 유효 기간
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            setBanners(data);
            setLoading(false);
            return true;
          }
        }
      } catch (e) {
        console.error("Cache parsing error", e);
      }
      return false;
    };

    const loadBanners = async () => {
      const hasCache = checkCache();

      try {
        // Prisma 기반 API 호출 (self-hosted PostgreSQL)
        const res = await fetch("/api/banners?activeOnly=true");
        if (!res.ok) throw new Error(`API 응답 오류: ${res.status}`);
        const { banners: data } = await res.json();

        if (isMounted && data && data.length > 0) {
          setBanners(data);
          localStorage.setItem("main_banners_cache", JSON.stringify({
            data,
            timestamp: Date.now(),
          }));
        } else if (isMounted && !hasCache) {
          // DB에 데이터 없으면 폴백
          setBanners(FALLBACK_BANNERS);
        }
      } catch (error) {
        console.warn("배너 로드 실패 (캐시/폴백 사용):", error);
        if (isMounted && !hasCache) {
          setBanners(FALLBACK_BANNERS);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (!checkCache()) {
      loadBanners();
    } else {
      // 캐시가 있어도 백그라운드에서 최신 데이터 갱신
      loadBanners();
    }

    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <section className="w-full">
        <Carousel className="w-full">
          <CarouselContent className="w-full flex justify-start gap-4 -ml-4">
            <Skeleton className="min-w-[90vw] md:min-w-[600px] w-[90vw] md:w-[600px] h-[300px] md:h-[400px] rounded-2xl ml-4" />
            <Skeleton className="min-w-[90vw] md:min-w-[600px] w-[90vw] md:w-[600px] h-[300px] md:h-[400px] rounded-2xl" />
          </CarouselContent>
        </Carousel>
      </section>
    );
  }

  if (banners.length === 0) return null;

  return (
    <section className="w-full pt-6 pb-2">
      <Carousel
        opts={{
          align: "center",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="w-full flex justify-start gap-0 -ml-0 pt-0 pb-0">
          {banners.map((banner, index) => (
            <CarouselItem
              key={banner.id}
              className="basis-[92%] md:basis-[48%] lg:basis-[40%] pl-2 md:pl-4"
            >
              <Link href={banner.link_url || "#"} className={banner.link_url ? "cursor-pointer" : "cursor-default"}>
                <div
                  className="w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl relative group isolate shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] ring-1 ring-white/10 transition-all duration-500 ease-supanova hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] hover:scale-[1.01]"
                >
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={banner.image_url || "/placeholder.jpg"}
                      alt={banner.title}
                      fill
                      className="object-cover transition-all duration-700 ease-supanova group-hover:scale-[1.06]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                      priority={index === 0}
                    />
                    {/* 프리미엄 멀티레이어 그라데이션 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-5 md:p-8 z-10 flex flex-col items-start justify-end h-full">
                    {banner.subtitle && (
                      <span className="badge-premium bg-white/15 text-white mb-3 backdrop-blur-xl border-white/20 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)]">
                        {banner.subtitle}
                      </span>
                    )}

                    <h2 className="text-[clamp(1.1rem,2.5vw,1.75rem)] font-black text-white leading-snug tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)] max-w-2xl break-keep">
                      {banner.title}
                    </h2>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        {banners.length > 1 && (
          <>
            <CarouselPrevious className="left-8 w-12 h-12 rounded-full border-none bg-white/10 hover:bg-white/25 backdrop-blur-xl text-white hidden md:flex shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] transition-all duration-300 ease-supanova hover:scale-105" />
            <CarouselNext className="right-8 w-12 h-12 rounded-full border-none bg-white/10 hover:bg-white/25 backdrop-blur-xl text-white hidden md:flex shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] transition-all duration-300 ease-supanova hover:scale-105" />
          </>
        )}
      </Carousel>
    </section>
  );
}

export default MainBanner;
