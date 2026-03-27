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
    <section className="w-full pt-6">
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
                  className="w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-lg relative group isolate shadow-md ring-1 ring-black/5"
                >
                  <div className="absolute inset-0 z-0">
                    <Image 
                      src={banner.image_url || "/placeholder.jpg"}
                      alt={banner.title} 
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                      priority={index === 0}
                    />
                    {/* Stronger Gradient for Clarity */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-5 md:p-8 z-10 flex flex-col items-start justify-end h-full">
                    {banner.subtitle && (
                      <span className="inline-block px-2.5 py-1 mb-3 text-[10px] font-black tracking-widest text-white uppercase bg-white/20 backdrop-blur-md rounded-full border border-white/10 shadow-sm">
                        {banner.subtitle}
                      </span>
                    )}
                    
                    <h2 className="text-[clamp(1.05rem,2.4vw,1.65rem)] font-black text-white leading-snug tracking-tight drop-shadow-lg max-w-2xl break-keep">
                      {banner.title}
                    </h2>
                    
                    {/* Description Hidden for Cleanliness */}
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        {banners.length > 1 && (
          <>
            <CarouselPrevious className="left-8 w-12 h-12 rounded-full border-none bg-white/10 hover:bg-white/20 backdrop-blur-md text-white hidden md:flex" />
            <CarouselNext className="right-8 w-12 h-12 rounded-full border-none bg-white/10 hover:bg-white/20 backdrop-blur-md text-white hidden md:flex" />
          </>
        )}
      </Carousel>
    </section>
  );
}

export default MainBanner;
