// src/app/search/SearchPageContent.tsx

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowLeft, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCard } from "@/components/ImageCard";
import { getSafeCustomData } from "@/lib/utils/data";
import { getCategoryName, getCategoryNameById, getCategoryValue } from "@/lib/categoryMap";

interface Project {
  id: string;
  title?: string;
  urls: {
    full: string;
    regular: string;
  };
  user: {
    username: string;
    profile_image: {
      small: string;
      large: string;
    };
  };
  likes: number;
  views?: number;
  description: string | null;
  alt_description: string | null;
  created_at: string;
  width: number;
  height: number;
  category: string;
  categorySlug?: string;
  categories?: string[];
  field?: string;
  fields?: string[];
  userId?: string;
  rendering_type?: string;
  allow_michelin_rating?: boolean;
  allow_stickers?: boolean;
  allow_secret_comments?: boolean;
  custom_data?: any;
  is_feedback_requested?: boolean;
  is_growth_requested?: boolean;
  audit_deadline?: string;
}

// Helper function to transform API data to Project
function transformProjectToCard(proj: any): Project {
  const userInfo = proj.User || proj.users || { username: 'Unknown', profile_image_url: '/globe.svg' };
  const imgUrl = proj.thumbnail_url || proj.image_url || proj.url || "/placeholder.jpg";

  let projectGenres: string[] = [];
  let projectFields: string[] = [];
  let primaryField = "it";

  try {
     const cData = getSafeCustomData(proj);

     if (cData?.fields && Array.isArray(cData.fields)) {
        projectFields = cData.fields.map((f: string) => f.toLowerCase());
     }
     if (cData?.selectedGenres && Array.isArray(cData.selectedGenres)) {
         projectGenres = cData.selectedGenres;
     } else if (cData?.genres && Array.isArray(cData.genres)) {
         projectGenres = cData.genres;
     }
  } catch {}

  if (projectFields.length > 0) {
      primaryField = projectFields[0];
  } else if (proj.field) {
      primaryField = proj.field;
      projectFields = [proj.field.toLowerCase()];
  }

  const categoryName = proj.Category?.name || getCategoryNameById(proj.category_id || proj.Category || 1);
  const mainCatSlug = getCategoryValue(categoryName);

  if (mainCatSlug && mainCatSlug !== 'all' && !projectGenres.includes(mainCatSlug)) {
      projectGenres.push(mainCatSlug);
  }

  return {
    id: proj.project_id.toString(),
    title: proj.title,
    urls: {
      full: imgUrl,
      regular: imgUrl
    },
    user: {
      username: userInfo.username || userInfo.nickname || 'Unknown',
      profile_image: {
        small: userInfo.profile_image_url || userInfo.avatar_url || '/globe.svg',
        large: userInfo.profile_image_url || userInfo.avatar_url || '/globe.svg'
      }
    },
    likes: proj.likes_count || proj.likes || 0,
    views: proj.views_count || proj.views || 0,
    description: proj.content_text || proj.description || '',
    alt_description: proj.title,
    created_at: proj.created_at,
    width: 400,
    height: 300,
    category: categoryName,
    categorySlug: mainCatSlug,
    categories: projectGenres,
    field: primaryField.toLowerCase(),
    fields: projectFields,
    userId: proj.user_id,
    rendering_type: proj.rendering_type,
    allow_michelin_rating: proj.allow_michelin_rating,
    allow_stickers: proj.allow_stickers,
    allow_secret_comments: proj.allow_secret_comments,
    custom_data: proj.custom_data,
    is_feedback_requested: getSafeCustomData(proj)?.is_feedback_requested,
    is_growth_requested: proj.is_growth_requested,
    audit_deadline: proj.audit_deadline,
  };
}

export default function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isFetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const categories = [
    { value: "all", label: "전체" },
    { value: "ai", label: "AI" },
    { value: "video", label: "영상/모션그래픽" },
    { value: "3d", label: "3D" },
    { value: "illustration", label: "일러스트" },
    { value: "uxui", label: "UX/UI" },
    { value: "web", label: "웹/모바일" },
    { value: "branding", label: "브랜딩" },
  ];

  // 검색 실행
  const performSearch = useCallback(
    async (pageNum = 1, reset = false) => {
      if (isFetchingRef.current && !reset) return;

      if (reset) {
        setLoading(true);
        setHasMore(true);
        isFetchingRef.current = true;
      }

      try {
        const limit = 20;
        let url = `/api/projects?page=${pageNum}&limit=${limit}`;

        if (searchQuery.trim()) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        if (selectedCategory && selectedCategory !== 'all') {
          url += `&category=${selectedCategory}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && (data.projects || data.data)) {
          const projectList = data.projects || data.data;
          const formattedProjects = projectList.map(transformProjectToCard);

          if (reset) {
            setSearchResults(formattedProjects);
          } else {
            setSearchResults(prev => [...prev, ...formattedProjects]);
          }

          if (projectList.length < limit) {
            setHasMore(false);
          }
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error('검색 실패:', error);
        setHasMore(false);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [searchQuery, selectedCategory]
  );

  // 검색어나 카테고리 변경 시 첫 페이지 로드
  useEffect(() => {
    setPage(1);
    performSearch(1, true);
  }, [searchQuery, selectedCategory, performSearch]);

  // URL searchParams 변경 감지
  useEffect(() => {
    const query = searchParams.get("q") || "";
    setSearchQuery(query);
  }, [searchParams]);

  // 무한 스크롤 - Intersection Observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isFetchingRef.current) {
          isFetchingRef.current = true;
          setLoadingMore(true);
          const nextPage = page + 1;
          setPage(nextPage);
          performSearch(nextPage).then(() => {
            setLoadingMore(false);
            isFetchingRef.current = false;
          });
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loading, hasMore, page, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    router.push('/search');
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="w-full bg-white border-b border-gray-200 sticky top-14 md:top-16 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 px-0"
          >
            <ArrowLeft size={20} />
            뒤로 가기
          </Button>

          {/* 검색 폼 */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 flex items-center border border-gray-300 px-4 py-3 rounded-xl bg-white focus-within:border-green-500 transition-colors shadow-sm">
                <Search size={20} className="text-gray-400 mr-3" />
                <Input
                  type="text"
                  placeholder="프로젝트 검색 (제목, 설명, 태그)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-none focus-visible:ring-0 p-0 text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-8 rounded-xl h-12 shadow-sm font-medium"
              >
                검색
              </Button>
            </div>
          </form>

          {/* 카테고리 필터 */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <Filter size={18} className="text-gray-400 mr-2 flex-shrink-0" />
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category.value
                    ? "bg-green-600 text-white shadow-md scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 검색 결과 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {searchQuery && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              '<span className="text-green-600">{searchQuery}</span>' 검색 결과
            </h2>
            <p className="text-gray-600 text-lg">
              {searchResults.length > 0 ? `${searchResults.length}개의 프로젝트를 찾았습니다` : '검색 결과가 없습니다'}
            </p>
          </div>
        )}

        {loading && searchResults.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="w-full h-64 bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-12 gap-x-6">
              {searchResults.map((project, index) => (
                <div key={project.id} className="w-full">
                  <ImageCard
                    props={project}
                    priority={index < 8}
                  />
                </div>
              ))}
            </div>

            {/* 무한 스크롤 센티넬 & 로딩 스피너 */}
            <div ref={sentinelRef} className="w-full py-12 flex items-center justify-center">
              {loadingMore && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 font-medium">더 많은 프로젝트 불러오는 중...</p>
                </div>
              )}
              {!hasMore && searchResults.length > 0 && (
                <p className="text-sm text-gray-400">모든 검색 결과를 불러왔습니다 ✨</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Search size={40} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {searchQuery
                ? "검색 결과가 없습니다"
                : "검색어를 입력하세요"}
            </h2>
            <p className="text-gray-600 mb-8 text-center max-w-md">
              {searchQuery
                ? "다른 검색어로 시도해보거나, 필터를 조정해보세요"
                : "프로젝트 제목, 설명, 태그로 검색할 수 있습니다"}
            </p>
            {searchQuery && (
              <Button
                onClick={() => router.push('/')}
                className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8"
              >
                홈으로 돌아가기
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
