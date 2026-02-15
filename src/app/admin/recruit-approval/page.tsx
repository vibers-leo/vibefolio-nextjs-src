"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink, Calendar, MapPin, Award, DollarSign, CheckCheck, Trash2, Briefcase, PartyPopper } from "lucide-react";
import { toast } from "sonner";

interface PendingItem {
  id: number;
  title: string;
  description: string;
  type: "job" | "contest" | "event";
  date: string;
  location?: string | null;
  prize?: string | null;
  salary?: string | null;
  company?: string | null;
  employment_type?: string | null;
  link?: string | null;
  thumbnail?: string | null;
  is_active: boolean;
  created_at: string;
  crawled_at?: string | null;
}

export default function RecruitApprovalPage() {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "job" | "contest" | "event">("all");

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    try {
      const { data, error } = await supabase
        .from('recruit_items')
        .select('*')
        .eq('is_approved', false)
        .order('crawled_at', { ascending: false });

      if (error) throw error;

      setPendingItems((data as any) || []);
      setSelectedIds(new Set()); // 새로고침 시 선택 초기화
    } catch (error) {
      console.error('Failed to load pending items:', error);
      toast.error('승인 대기 항목을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // === 선택 관리 ===
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 필터링된 아이템
  const filteredItems = filterType === "all"
    ? pendingItems
    : pendingItems.filter(item => item.type === filterType);

  // 타입별 카운트
  const typeCounts = {
    all: pendingItems.length,
    job: pendingItems.filter(i => i.type === "job").length,
    contest: pendingItems.filter(i => i.type === "contest").length,
    event: pendingItems.filter(i => i.type === "event").length,
  };

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const filteredIds = filteredItems.map(item => item.id);
      const allFilteredSelected = filteredIds.every(id => prev.has(id));
      if (allFilteredSelected) {
        // 현재 필터 항목만 해제
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      }
      // 현재 필터 항목 모두 선택
      const next = new Set(prev);
      filteredIds.forEach(id => next.add(id));
      return next;
    });
  }, [filteredItems]);

  const isAllSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.has(item.id));

  // === 관심사 기반 추천 알림 트리거 (fire-and-forget) ===
  const triggerRecommendationMatch = (ids: number[]) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch('/api/recommendations/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ approvedItemIds: ids }),
      }).catch((err) => console.error('[Recommendations] Match failed:', err));
    });
  };

  // === 개별 승인/거부 ===
  const handleApprove = async (id: number) => {
    setProcessing(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('recruit_items')
        .update({
          is_approved: true,
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('승인되었습니다!');
      triggerRecommendationMatch([id]);
      loadPendingItems();
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('승인에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('정말 거부하시겠습니까? 이 항목은 삭제됩니다.')) return;

    setProcessing(id);
    try {
      const { error } = await supabase
        .from('recruit_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('거부되었습니다.');
      loadPendingItems();
    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('거부에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  // === 일괄 승인 ===
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }

    setBulkProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ids = Array.from(selectedIds);

      const { error } = await supabase
        .from('recruit_items')
        .update({
          is_approved: true,
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .in('id', ids);

      if (error) throw error;

      toast.success(`${ids.length}개 항목이 승인되었습니다!`);
      triggerRecommendationMatch(ids);
      loadPendingItems();
    } catch (error) {
      console.error('Bulk approval failed:', error);
      toast.error('일괄 승인에 실패했습니다.');
    } finally {
      setBulkProcessing(false);
    }
  };

  // === 일괄 거부 ===
  const handleBulkReject = async () => {
    if (selectedIds.size === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }

    if (!confirm(`선택된 ${selectedIds.size}개 항목을 모두 거부(삭제)하시겠습니까?`)) return;

    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);

      const { error } = await supabase
        .from('recruit_items')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast.success(`${ids.length}개 항목이 거부되었습니다.`);
      loadPendingItems();
    } catch (error) {
      console.error('Bulk rejection failed:', error);
      toast.error('일괄 거부에 실패했습니다.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case "job":
        return { label: "채용", color: "bg-blue-100 text-blue-700" };
      case "contest":
        return { label: "공모전", color: "bg-purple-100 text-purple-700" };
      case "event":
        return { label: "이벤트", color: "bg-green-100 text-green-700" };
      default:
        return { label: "기타", color: "bg-gray-100 text-gray-700" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                크롤링 항목 승인
              </h1>
              <p className="text-gray-500 text-sm">
                자동 크롤링된 항목을 검토하고 승인하세요. 총 {pendingItems.length}개 대기 중
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPendingItems}
            >
              새로고침
            </Button>
          </div>

          {/* 타입 필터 탭 */}
          <div className="flex gap-2">
            {([
              { key: "all" as const, label: "전체", icon: null, activeClass: "bg-slate-900 text-white" },
              { key: "job" as const, label: "채용", icon: Briefcase, activeClass: "bg-blue-600 text-white" },
              { key: "contest" as const, label: "공모전", icon: Award, activeClass: "bg-purple-600 text-white" },
              { key: "event" as const, label: "이벤트", icon: PartyPopper, activeClass: "bg-green-600 text-white" },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => { setFilterType(tab.key); setSelectedIds(new Set()); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  filterType === tab.key
                    ? tab.activeClass + ' shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                } ${typeCounts[tab.key] === 0 && tab.key !== 'all' ? 'opacity-40' : ''}`}
                disabled={typeCounts[tab.key] === 0 && tab.key !== 'all'}
              >
                {tab.icon && <tab.icon size={14} />}
                {tab.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filterType === tab.key ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {typeCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 일괄 액션 바 */}
        {filteredItems.length > 0 && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-white rounded-xl border shadow-sm">
            <button
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                isAllSelected
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {isAllSelected && <Check size={14} strokeWidth={3} />}
            </button>
            <span className="text-sm text-gray-600 mr-2">
              {selectedIds.size > 0
                ? `${selectedIds.size}개 선택됨`
                : '전체 선택'}
            </span>

            <div className="flex-1" />

            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleBulkApprove}
              disabled={selectedIds.size === 0 || bulkProcessing}
            >
              <CheckCheck size={16} className="mr-1.5" />
              일괄 승인 ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkReject}
              disabled={selectedIds.size === 0 || bulkProcessing}
            >
              <Trash2 size={16} className="mr-1.5" />
              일괄 거부 ({selectedIds.size})
            </Button>
          </div>
        )}

        {/* 항목 목록 */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">
                {pendingItems.length === 0
                  ? '승인 대기 중인 항목이 없습니다.'
                  : `${filterType === 'job' ? '채용' : filterType === 'contest' ? '공모전' : '이벤트'} 항목이 없습니다.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredItems.map((item) => {
              const typeInfo = getTypeInfo(item.type);
              const isSelected = selectedIds.has(item.id);

              return (
                <Card
                  key={item.id}
                  className={`hover:shadow-lg transition-all ${
                    isSelected ? 'ring-2 ring-green-500 shadow-md' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      {/* 체크박스 */}
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className={`mt-1 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                          {item.employment_type && (
                            <Badge variant="outline">{item.employment_type}</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        {item.company && (
                          <p className="text-sm text-gray-600 mt-1">{item.company}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {item.description}
                    </p>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{new Date(item.date).toLocaleDateString("ko-KR")}</span>
                      </div>
                      {item.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <span>{item.location}</span>
                        </div>
                      )}
                      {item.salary && (
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} className="text-gray-400" />
                          <span>{item.salary}</span>
                        </div>
                      )}
                      {item.prize && (
                        <div className="flex items-center gap-2">
                          <Award size={16} className="text-gray-400" />
                          <span>{item.prize}</span>
                        </div>
                      )}
                    </div>

                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4"
                      >
                        <ExternalLink size={14} />
                        원본 링크 확인
                      </a>
                    )}

                    <div className="text-xs text-gray-400 mb-4">
                      크롤링 시간: {item.crawled_at ? new Date(item.crawled_at).toLocaleString("ko-KR") : '알 수 없음'}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(item.id)}
                        disabled={processing === item.id || bulkProcessing}
                      >
                        <Check size={16} className="mr-1" />
                        승인
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleReject(item.id)}
                        disabled={processing === item.id || bulkProcessing}
                      >
                        <X size={16} className="mr-1" />
                        거부
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
