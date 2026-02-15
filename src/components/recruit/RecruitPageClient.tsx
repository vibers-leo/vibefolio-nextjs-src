// src/app/recruit/page.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRecruitBookmarks, toggleRecruitBookmark } from "@/lib/recruit-bookmarks";
import { useAuth } from "@/lib/auth/AuthContext";
import { ContestCalendar } from "./ContestCalendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MainBanner } from "@/components/MainBanner";
import { FontAwesomeIcon } from "@/components/FaIcon";
import { 
  faPlus,
  faTrash,
  faEdit,
  faCalendar,
  faMapMarkerAlt,
  faAward,
  faBriefcase,
  faExternalLinkAlt,
  faClock,
  faStar,
  faSpinner,
  faEye,
  faUpload,
  faFileAlt,
  faXmark,
  faSort,
  faSearch,
  faWandMagicSparkles,
  faBookmark,
  faCalendarDays,
  faList
} from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/lib/supabase/client";
import { uploadImage, uploadFile } from "@/lib/supabase/storage";
import { toast } from "sonner";
// badge removed
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";



interface Item {
  id: number;
  title: string;
  description: string;
  type: "job" | "contest" | "event";
  date: string;
  location?: string;
  prize?: string;
  salary?: string;
  company?: string;
  employmentType?: string;
  link?: string;
  thumbnail?: string;
  is_approved?: boolean;
  is_active?: boolean;
  views_count?: number;
  // 추가 필드
  application_target?: string;
  sponsor?: string;
  total_prize?: string;
  first_prize?: string;
  start_date?: string;
  category_tags?: string;
  banner_image_url?: string;
  attachments?: { name: string; url: string; size: number; type: string }[];
  created_at?: string;
}

export default function RecruitPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [banners, setBanners] = useState<number[]>([1, 2, 3]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isExtracting, setIsExtracting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "job" as "job" | "contest" | "event",
    date: "",
    location: "",
    prize: "",
    salary: "",
    company: "",
    employmentType: "정규직",
    link: "",
    thumbnail: "",
    // 추가 상세 정보 필드
    application_target: "",
    sponsor: "",
    total_prize: "",
    first_prize: "",
    start_date: "",
    category_tags: "",
    banner_image_url: "",
    attachments: [] as { name: string; url: string; size: number; type: string }[]
  });

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // users 테이블에서 role 확인
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single() as { data: { role: string } | null };
        
        if (userData?.role === 'admin') {
          setIsAdmin(true);
        }
      }
    };
    checkAdmin();
  }, []);

  // 찜(북마크) 로드
  useEffect(() => {
    if (user?.id) {
      getUserRecruitBookmarks(user.id).then(ids => {
        setBookmarkedIds(new Set(ids));
      });
    }
  }, [user?.id]);

  const handleToggleBookmark = async (itemId: number) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    const isNowBookmarked = await toggleRecruitBookmark(itemId);
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isNowBookmarked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  // 페이지네이션 + 검색 상태
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout>();

  // API에서 항목 가져오기 (페이지네이션)
  const fetchItems = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        sort: sortBy,
      });
      if (activeTab !== 'all') params.set('type', activeTab);
      if (search) params.set('search', search);

      const res = await fetch(`/api/recruit-items?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      const formattedItems: Item[] = (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type as "job" | "contest" | "event",
        date: item.date,
        location: item.location || undefined,
        prize: item.prize || undefined,
        salary: item.salary || undefined,
        company: item.company || undefined,
        employmentType: item.employment_type || undefined,
        link: item.link || undefined,
        thumbnail: item.thumbnail || undefined,
        views_count: item.views_count || 0,
        application_target: item.application_target || undefined,
        sponsor: item.sponsor || undefined,
        total_prize: item.total_prize || undefined,
        first_prize: item.first_prize || undefined,
        start_date: item.start_date || undefined,
        category_tags: item.category_tags || undefined,
        banner_image_url: item.banner_image_url || undefined,
        attachments: item.attachments || [],
        created_at: item.created_at,
      }));

      if (append) {
        setItems(prev => [...prev, ...formattedItems]);
      } else {
        setItems(formattedItems);
      }
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (e) {
      console.error('Error loading items:', e);
    }
  }, [activeTab, search, sortBy]);

  // 탭/검색/정렬 변경 시 처음부터 로드
  useEffect(() => {
    pageRef.current = 1;
    setLoading(true);
    fetchItems(1, false).finally(() => setLoading(false));
  }, [fetchItems]);

  // 검색 디바운스
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
    }, 400);
  };

  // Intersection Observer 무한스크롤
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = pageRef.current + 1;
          pageRef.current = nextPage;
          setLoadingMore(true);
          fetchItems(nextPage, true).finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchItems]);

  // 폼 제출 후 목록 새로고침 헬퍼
  const loadItems = async () => {
    pageRef.current = 1;
    await fetchItems(1, false);
  };

  // 항목 추가/수정 (API 사용)
  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.date) {
      alert("제목, 설명, 날짜는 필수 항목입니다.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요합니다.");
        return;
      }

      const itemData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        date: formData.date,
        location: formData.location || null,
        prize: formData.prize || null,
        salary: formData.salary || null,
        company: formData.company || null,
        employment_type: formData.employmentType || null,
        link: formData.link || null,
        thumbnail: formData.thumbnail || null,
        is_approved: isAdmin ? true : false, // 관리자가 아니면 승인 대기
        is_active: true,
        // 추가 필드 저장
        application_target: formData.application_target || null,
        sponsor: formData.sponsor || null,
        total_prize: formData.total_prize || null,
        first_prize: formData.first_prize || null,
        start_date: formData.start_date || null,
        category_tags: formData.category_tags || null,
        banner_image_url: formData.banner_image_url || null,
      };

      if (editingItem) {
        // 수정
        const response = await fetch(`/api/recruit-items/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          throw new Error('Failed to update item');
        }
      } else {
        // 추가
        const response = await fetch('/api/recruit-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          throw new Error('Failed to create item');
        }
      }

      // 성공 후 목록 새로고침
      await loadItems();
      
      // 폼 초기화
      setFormData({
        title: "",
        description: "",
        type: "job",
        date: "",
        location: "",
        prize: "",
        salary: "",
        company: "",
        employmentType: "정규직",
        link: "",
        thumbnail: "",
        application_target: "",
        sponsor: "",
        total_prize: "",
        first_prize: "",
        start_date: "",
        category_tags: "",
        banner_image_url: "",
        attachments: []
      });
      setEditingItem(null);
      handleDialogClose();
      
      if (!isAdmin) {
        alert("정보가 제보되었습니다. 관리자 승인 후 목록에 표시됩니다. 감사합니다!");
      } else {
        alert(editingItem ? "수정되었습니다." : "추가되었습니다.");
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  // AI 정보 추출 로직
  const handleExtractInfo = async () => {
    if (!formData.link) {
      toast.error("분석할 링크를 입력해주세요.");
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch('/api/recruit/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.link }),
      });

      if (!response.ok) throw new Error('Failed to extract');

      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        date: data.date || prev.date,
        company: data.company || prev.company,
        prize: data.prize || prev.prize,
        location: data.location || prev.location,
        thumbnail: data.thumbnail || prev.thumbnail,
      }));

      toast.success("AI가 정보를 성공적으로 분석했습니다!");
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error("정보 추출 중 오류가 발생했습니다.");
    } finally {
      setIsExtracting(false);
    }
  };

  // 항목 삭제 (API 사용)
  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요합니다.");
        return;
      }

      const response = await fetch(`/api/recruit-items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      // 성공 후 목록 새로고침
      await loadItems();
      alert("삭제되었습니다.");
    } catch (error) {
      console.error('Error deleting item:', error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 항목 수정 시작
  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      type: item.type,
      date: item.date,
      location: item.location || "",
      prize: item.prize || "",
      salary: item.salary || "",
      company: item.company || "",
      employmentType: item.employmentType || "정규직",
      link: item.link || "",
      thumbnail: item.thumbnail || "",
      application_target: item.application_target || "",
      sponsor: item.sponsor || "",
      total_prize: item.total_prize || "",
      first_prize: item.first_prize || "",
      start_date: item.start_date || "",
      category_tags: item.category_tags || "",
      banner_image_url: item.banner_image_url || "",
      attachments: item.attachments || []
    });
    setIsDialogOpen(true);
  };

  // 다이얼로그 닫을 때 초기화
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      type: "job",
      date: "",
      location: "",
      prize: "",
      salary: "",
      company: "",
      employmentType: "정규직",
      link: "",
      thumbnail: "",
      application_target: "",
      sponsor: "",
      total_prize: "",
      first_prize: "",
      start_date: "",
      category_tags: "",
      banner_image_url: "",
      attachments: []
    });
  };

  // 자세히 보기 클릭 핸들러 (내부 상세 페이지로 이동)
  const handleViewDetail = (item: Item) => {
    router.push(`/recruit/${item.id}`);
  };

  // 제보하기 기능 (일반 사용자)
  const handleUserSubmit = () => {
    setEditingItem(null);
    handleDialogClose();
    setIsDialogOpen(true);
  };

  // D-day 계산
  const getDday = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return '마감';
    if (diff === 0) return 'D-Day';
    return `D-${diff}`;
  };

  const [sortBy, setSortBy] = useState("deadline");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 섹션 */}
      <section className="w-full">
        <MainBanner />
      </section>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              연결 - 채용 · 공모전 · 이벤트
            </h1>
            <p className="text-gray-600">
              크리에이터들을 위한 채용 정보, 공모전, 이벤트를 확인하세요
            </p>
          </div>
          
          {/* 관리자 추가 버튼 또는 사용자 제보 버튼 */}
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant={isAdmin ? "default" : "outline"}
                  className={isAdmin ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-600 text-green-600 hover:bg-green-50"}
                  onClick={() => handleDialogClose()}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  {isAdmin ? "새 항목 추가" : "정보 제보하기"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isAdmin ? (editingItem ? "항목 수정" : "새 항목 추가") : "공모전/채용 정보 제보"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      유형
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as "job" | "contest" | "event",
                        })
                      }
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="job">채용</option>
                      <option value="contest">공모전</option>
                      <option value="event">이벤트</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      제목 *
                    </label>
                    <Input
                      placeholder="제목을 입력하세요"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명 *
                    </label>
                    <Textarea
                      placeholder="설명을 입력하세요"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={4}
                    />
                  </div>

                  {/* 채용 전용 필드 */}
                  {formData.type === "job" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          회사명
                        </label>
                        <Input
                          placeholder="회사명을 입력하세요"
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({ ...formData, company: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            고용 형태
                          </label>
                          <select
                            value={formData.employmentType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                employmentType: e.target.value,
                              })
                            }
                            className="w-full border rounded-md px-3 py-2"
                          >
                            <option value="정규직">정규직</option>
                            <option value="계약직">계약직</option>
                            <option value="프리랜서">프리랜서</option>
                            <option value="인턴">인턴</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            급여
                          </label>
                          <Input
                            placeholder="예: 연봉 3,500~4,500만원"
                            value={formData.salary}
                            onChange={(e) =>
                              setFormData({ ...formData, salary: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* 공모전 전용 필드 */}
                  {formData.type === "contest" && (
                    <div className="space-y-4 border-l-4 border-[#16A34A] pl-4 py-2 bg-[#16A34A]/5 rounded-r-lg">
                      <h3 className="font-bold text-[#16A34A] text-sm flex items-center gap-2">
                        <FontAwesomeIcon icon={faAward} /> 공모전 상세 정보
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">상금/혜택</label>
                          <Input value={formData.prize} onChange={e => setFormData({...formData, prize: e.target.value})} placeholder="예: 대상 500만원" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">응모 대상</label>
                          <Input value={formData.application_target} onChange={e => setFormData({...formData, application_target: e.target.value})} placeholder="예: 대학생, 일반인" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">총 상금</label>
                          <Input value={formData.total_prize} onChange={e => setFormData({...formData, total_prize: e.target.value})} placeholder="예: 2,000만원" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">1등 상금</label>
                          <Input value={formData.first_prize} onChange={e => setFormData({...formData, first_prize: e.target.value})} placeholder="예: 500만원" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">분야 (태그)</label>
                          <Input value={formData.category_tags} onChange={e => setFormData({...formData, category_tags: e.target.value})} placeholder="예: 영상, 디자인 (쉼표 구분)" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">후원/협찬</label>
                          <Input value={formData.sponsor} onChange={e => setFormData({...formData, sponsor: e.target.value})} placeholder="예: 문화체육관광부" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        마감일/날짜 *
                      </label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        장소
                      </label>
                      <Input
                        placeholder="장소를 입력하세요"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* 이미지 섹션 (강화 - 드래그 앤 드롭 UI) */}
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <FontAwesomeIcon icon={faPlus} className="text-[#16A34A]" /> 포스터 이미지 (썸네일)
                      </label>
                      
                      <div 
                        className={`relative group h-48 rounded-[32px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden bg-slate-50 cursor-pointer ${
                          formData.thumbnail ? 'border-[#16A34A] bg-[#16A34A]/5' : 'border-slate-200 hover:border-[#16A34A] hover:bg-slate-100'
                        }`}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[#16A34A]', 'bg-[#16A34A]/5'); }}
                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-[#16A34A]', 'bg-[#16A34A]/5'); }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-[#16A34A]', 'bg-[#16A34A]/5');
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            try {
                              toast.info("포스터 업로드 중...");
                              const url = await uploadImage(file, 'recruits');
                              setFormData({...formData, thumbnail: url});
                              toast.success("포스터 이미지가 적용되었습니다.");
                            } catch (err) {
                              toast.error("업로드 실패: " + (err as Error).message);
                            }
                          }
                        }}
                        onClick={() => document.getElementById('recruit-thumb-upload')?.click()}
                      >
                        {formData.thumbnail ? (
                          <>
                            <img src={formData.thumbnail} alt="Poster" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <p className="text-white font-bold flex items-center gap-2">
                                <FontAwesomeIcon icon={faUpload} /> 이미지 변경하기 (클릭/드래그)
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center space-y-2 px-4">
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mx-auto text-slate-400 group-hover:text-[#16A34A] transition-colors">
                              <FontAwesomeIcon icon={faUpload} />
                            </div>
                            <p className="text-xs font-bold text-slate-500">포스터 이미지를 끌어다 놓거나 클릭하여 업로드하세요</p>
                            <p className="text-[10px] text-slate-400">4:5 비율 권장 (JPG, PNG, WebP)</p>
                          </div>
                        )}
                      </div>

                      <input 
                        type="file" 
                        id="recruit-thumb-upload" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            toast.info("포스터 업로드 중...");
                            const url = await uploadImage(file, 'recruits');
                            setFormData({...formData, thumbnail: url});
                            toast.success("포스터 이미지가 적용되었습니다.");
                          } catch (err) {
                            toast.error("업로드 실패: " + (err as Error).message);
                          }
                        }}
                      />
                      <Input
                        placeholder="또는 이미지 URL 직접 입력 (https://...)"
                        value={formData.thumbnail}
                        onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                        className="h-11 rounded-xl bg-white border-slate-100"
                      />
                    </div>

                    {isAdmin && (
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <FontAwesomeIcon icon={faWandMagicSparkles} className="text-amber-500" /> 상세 페이지 히어로 배너 (와이드)
                        </label>
                        
                        <div 
                          className={`relative group h-40 rounded-[32px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden bg-slate-50 cursor-pointer ${
                            formData.banner_image_url ? 'border-amber-500 bg-amber-50/10' : 'border-slate-200 hover:border-amber-500 hover:bg-slate-100'
                          }`}
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-amber-500', 'bg-amber-50/10'); }}
                          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-amber-500', 'bg-amber-50/10'); }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-amber-500', 'bg-amber-50/10');
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              try {
                                toast.info("배너 업로드 중...");
                                const url = await uploadImage(file, 'banners');
                                setFormData({...formData, banner_image_url: url});
                                toast.success("와이드 배너 이미지가 적용되었습니다.");
                              } catch (err) {
                                toast.error("업로드 실패: " + (err as Error).message);
                              }
                            }
                          }}
                          onClick={() => document.getElementById('recruit-banner-upload')?.click()}
                        >
                          {formData.banner_image_url ? (
                            <>
                              <img src={formData.banner_image_url} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white font-bold flex items-center gap-2">
                                  <FontAwesomeIcon icon={faUpload} /> 이미지 변경하기 (클릭/드래그)
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2 px-4">
                              <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mx-auto text-slate-400 group-hover:text-amber-500 transition-colors">
                                <FontAwesomeIcon icon={faUpload} />
                              </div>
                              <p className="text-xs font-bold text-slate-500">와이드 이미지를 끌어다 놓거나 클릭하여 업로드하세요</p>
                              <p className="text-[10px] text-slate-400">16:6 비율 권장 (JPG, PNG, WebP)</p>
                            </div>
                          )}
                        </div>

                        <input 
                          type="file" 
                          id="recruit-banner-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              toast.info("배너 업로드 중...");
                              const url = await uploadImage(file, 'banners');
                              setFormData({...formData, banner_image_url: url});
                              toast.success("와이드 배너 이미지가 적용되었습니다.");
                            } catch (err) {
                              toast.error("업로드 실패: " + (err as Error).message);
                            }
                          }}
                        />
                        <Input
                          placeholder="또는 와이드 이미지 URL 직접 입력 (https://...)"
                          value={formData.banner_image_url}
                          onChange={(e) => setFormData({ ...formData, banner_image_url: e.target.value })}
                          className="h-11 rounded-xl bg-white border-slate-100"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">* 상세 페이지 상단에 와이드하게 노출될 이미지를 등록하세요.</p>
                      </div>
                    )}
                  </div>

                  {/* 파일 첨부 영역 */}
                  <div className="space-y-3 pt-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                       <FontAwesomeIcon icon={faFileAlt} /> 공고문 파일 첨부 (최대 10개, 개당 20MB)
                    </label>
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {formData.attachments && formData.attachments.length > 0 && (
                            <div className="flex flex-col gap-2">
                                {formData.attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg text-xs font-medium text-slate-700 border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FontAwesomeIcon icon={faFileAlt} />
                                            <span className="truncate max-w-[200px]">{file.name}</span>
                                            <span className="text-slate-400 shrink-0">({(file.size / 1024 / 1024).toFixed(2)}MB)</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const newFiles = [...(formData.attachments || [])];
                                                newFiles.splice(idx, 1);
                                                setFormData({...formData, attachments: newFiles});
                                            }}
                                            className="text-slate-400 hover:text-red-500 p-1"
                                        >
                                            <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                id="file-upload"
                                multiple
                                className="hidden"
                                onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length === 0) return;
                                    
                                    const currentCount = formData.attachments?.length || 0;
                                    if (currentCount + files.length > 10) {
                                        toast.error("파일은 최대 10개까지만 업로드 가능합니다.");
                                        return;
                                    }

                                    for (const file of files) {
                                        if (file.size > 20 * 1024 * 1024) {
                                            toast.error(`${file.name} 파일이 20MB를 초과합니다.`);
                                            continue;
                                        }
                                        try {
                                            toast.info(`${file.name} 업로드 중...`);
                                            // 'recruit_files' 버킷 사용 (없으면 에러)
                                            const uploaded = await uploadFile(file, 'recruit_files'); 
                                            
                                            setFormData(prev => ({
                                                ...prev, 
                                                attachments: [...(prev.attachments || []), uploaded]
                                            }));
                                            toast.success(`${file.name} 업로드 완료`);
                                        } catch (err: any) {
                                            console.error(err);
                                            toast.error(`업로드 실패: ${err.message}. 버킷(recruit_files)이 생성되었는지 확인해주세요.`);
                                        }
                                    }
                                    e.target.value = ''; // 초기화
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('file-upload')?.click()}
                                className="h-10 border-dashed border-slate-300 text-slate-500 hover:text-[#16A34A] hover:border-[#16A34A] w-full"
                                disabled={(formData.attachments?.length || 0) >= 10}
                            >
                                <FontAwesomeIcon icon={faPlus} /> 파일 추가하기
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center">PDF, HWP, DOCX 등 공고문 파일 권장</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      바로가기 링크 (필수)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com"
                        value={formData.link}
                        onChange={(e) =>
                          setFormData({ ...formData, link: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        className="shrink-0 border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A]/10 gap-2"
                        onClick={handleExtractInfo}
                        disabled={isExtracting}
                      >
                        {isExtracting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faStar} />}
                        AI 추출
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      채용/공모전/이벤트 상세 페이지 URL을 입력해주세요
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button variant="ghost" onClick={handleDialogClose} className="h-12 px-6 rounded-2xl font-bold text-slate-400">
                      취소
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="h-12 px-8 bg-slate-900 border-none shadow-xl hover:shadow-[#16A34A]/20 hover:bg-[#16A34A] text-white rounded-2xl font-bold transition-all duration-300"
                    >
                      {isAdmin ? (editingItem ? "정보 수정하기" : "정보 등록하기") : "정보 제보하기"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 필터바: 탭 + 검색 + 정렬 */}
        <div className="sticky top-[56px] z-30 bg-gray-50/95 backdrop-blur-sm pb-4 pt-2 -mx-6 px-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* 타입 탭 */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { value: "all", label: "전체" },
                { value: "contest", label: "공모전" },
                { value: "job", label: "채용" },
                { value: "event", label: "이벤트" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`rounded-xl px-5 py-2.5 font-black text-xs uppercase tracking-widest transition-all border ${
                    activeTab === tab.value
                      ? "bg-slate-900 text-white border-slate-900"
                      : "text-slate-400 border-transparent hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.value && ` (${total})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* 검색 */}
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="검색..."
                  className="h-10 w-[180px] pl-9 pr-3 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
                />
              </div>

              {/* 정렬 */}
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faSort} className="text-slate-400" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px] h-10 rounded-xl border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-wider focus:ring-[#16A34A]/20">
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100">
                    <SelectItem value="deadline" className="text-xs font-bold">마감임박순</SelectItem>
                    <SelectItem value="created" className="text-xs font-bold">최신등록순</SelectItem>
                    <SelectItem value="views" className="text-xs font-bold">조회수순</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 뷰 토글 (공모전 탭) */}
              {(activeTab === "contest" || activeTab === "all") && (
                <div className="flex items-center rounded-xl border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 h-10 flex items-center gap-1.5 text-xs font-bold transition-colors ${
                      viewMode === "list" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <FontAwesomeIcon icon={faList} className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setViewMode("calendar")}
                    className={`px-3 h-10 flex items-center gap-1.5 text-xs font-bold transition-colors ${
                      viewMode === "calendar" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <FontAwesomeIcon icon={faSpinner} spin className="w-8 h-8 text-slate-300" />
            </div>
          ) : viewMode === "calendar" ? (
            /* 캘린더 뷰 */
            <ContestCalendar
              items={items.map(it => ({ id: it.id, title: it.title, date: it.date, company: it.company, type: it.type }))}
              bookmarkedIds={bookmarkedIds}
              onItemClick={(id) => router.push(`/recruit/${id}`)}
            />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            /* 리스트 뷰 */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetail={handleViewDetail}
                    isAdmin={isAdmin}
                    getDday={getDday}
                    isBookmarked={bookmarkedIds.has(item.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>

              {/* 무한스크롤 센티넬 */}
              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {loadingMore && (
                  <FontAwesomeIcon icon={faSpinner} spin className="w-6 h-6 text-slate-300" />
                )}
                {!hasMore && items.length > 0 && (
                  <p className="text-sm text-slate-400">모든 항목을 불러왔습니다</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// 출처 분석 유틸리티
const getSourceFromLink = (link?: string) => {
  if (!link) return null;
  if (link.includes('ipmarket.or.kr') || link.includes('idearo')) return '모두의 아이디어';
  if (link.includes('saramin')) return '사람인';
  if (link.includes('jobkorea')) return '잡코리아';
  if (link.includes('wanted')) return '원티드';
  if (link.includes('linkareer')) return '링커리어';
  if (link.includes('pureal')) return '퓨리얼';
  if (link.includes('mss.go.kr')) return '중소벤처기업부';
  return null;
};

// 항목 카드 컴포넌트
function ItemCard({
  item,
  onEdit,
  onDelete,
  onViewDetail,
  isAdmin,
  getDday,
  isBookmarked,
  onToggleBookmark,
}: {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => void;
  onViewDetail: (item: Item) => void;
  isAdmin: boolean;
  getDday: (date: string) => string;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: number) => void;
}) {
  const getTypeInfo = (type: string) => {
    switch (type) {
      case "job":
        return { label: "채용", color: "bg-blue-50 text-blue-600 border-blue-100", icon: faBriefcase };
      case "contest":
        return { label: "공모전", color: "bg-purple-50 text-purple-600 border-purple-100", icon: faAward };
      case "event":
        return { label: "이벤트", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: faCalendar };
      default:
        return { label: "기타", color: "bg-gray-50 text-gray-600 border-gray-100", icon: faCalendar };
    }
  };

  const typeInfo = getTypeInfo(item.type);
  const dday = getDday(item.date);
  const isExpired = dday === '마감';

  return (
    <Card className={`group border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-[24px] overflow-hidden bg-white flex flex-col h-full ${isExpired ? 'opacity-60' : ''}`}>
      {/* Thumbnail Area - Aspect Ratio (3:4) with Full Bleed Image (No Zoom) */}
      <div 
        className="relative aspect-[3/4] overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer group/image"
        onClick={() => onViewDetail(item)}
      >
        {item.thumbnail ? (
          <img 
            src={item.thumbnail} 
            alt={item.title} 
            className="w-full h-full object-cover pointer-events-none transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <FontAwesomeIcon icon={typeInfo.icon} className="w-10 h-10" />
          </div>
        )}
        
        {/* Shine Effect Overlay */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 pointer-events-none" />
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4 flex gap-2 z-10 pointer-events-none">
          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${typeInfo.color} backdrop-blur-md bg-white/80 shadow-sm`}>
            {typeInfo.label}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm ${
            isExpired 
              ? 'bg-slate-200 text-slate-500' 
              : dday === 'D-Day' 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-slate-900 text-white'
          }`}>
            {dday}
          </span>
        </div>

        {/* 찜 + 관리자 버튼 */}
        <div className="absolute top-4 right-4 flex gap-1 z-10">
          {onToggleBookmark && (
            <button
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
                isBookmarked
                  ? 'bg-yellow-400 text-white'
                  : 'bg-white/90 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-yellow-500'
              }`}
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(item.id); }}
            >
              <FontAwesomeIcon icon={faBookmark} className="w-3.5 h-3.5" />
            </button>
          )}
          {isAdmin && (
            <>
              <Button
                size="icon"
                variant="secondary"
                className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              >
                <FontAwesomeIcon icon={faEdit} />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 text-white shadow-sm border-none opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </>
          )}
        </div>
      </div>

      <CardHeader className="p-4 pb-1">
        <div className="space-y-1 h-[60px]"> {/* Fixed height for title alignment */}
          <div className="flex items-center gap-2">
            {item.company && (
              <p className="text-[10px] font-black text-[#16A34A] tracking-wider uppercase leading-none truncate max-w-[120px]">{item.company}</p>
            )}
            {getSourceFromLink(item.link) && (
              <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-md font-bold tracking-tight">
                via {getSourceFromLink(item.link)}
              </span>
            )}
          </div>
          <CardTitle 
            className="text-lg font-bold line-clamp-2 leading-tight group-hover:text-[#16A34A] transition-colors cursor-pointer"
            onClick={() => onViewDetail(item)}
          >
            {item.title}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex flex-col flex-1">
        <div className="h-[36px] mb-3"> {/* Fixed height for description */}
          <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">
            {item.description}
          </p>
        </div>
        
        <div className="mt-auto pt-3 border-t border-slate-50 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faClock} />
                <span>~ {new Date(item.date).toLocaleDateString("ko-KR")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faEye} />
                <span>{item.views_count?.toLocaleString() || 0}</span>
              </div>
            </div>
            {item.location && (
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faMapMarkerAlt} />
                <span>{item.location}</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full h-10 rounded-xl bg-slate-50 hover:bg-[#16A34A] hover:text-slate-900 transition-all duration-300 font-bold text-xs flex items-center justify-center gap-2 group/btn shadow-sm hover:shadow-[#16A34A]/25"
            onClick={() => onViewDetail(item)}
            disabled={isExpired}
          >
            자세히 보기
            <FontAwesomeIcon icon={faExternalLinkAlt} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 빈 상태 컴포넌트
function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-500">
      <p className="text-lg">등록된 항목이 없습니다.</p>
      <p className="text-sm mt-2">관리자가 새 항목을 추가하면 여기에 표시됩니다.</p>
    </div>
  );
}
