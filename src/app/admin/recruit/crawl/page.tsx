// src/app/admin/recruit/crawl/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  RefreshCw, 
  Database, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  ArrowLeft,
  Search
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";

interface CrawlLog {
  id: number;
  created_at: string;
  type: string;
  status: string;
  items_found: number;
  items_added: number;
  items_updated: number;
  error_message?: string;
  duration_ms: number;
}

interface Statistics {
  total: number;
  crawled: number;
  manual: number;
  byType: {
    job: number;
    contest: number;
    event: number;
  };
}

export default function AdminRecruitCrawlPage() {
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  // 크롤링 상태 및 로그 가져오기
  const fetchCrawlStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const response = await fetch('/api/crawl', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch crawl status');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setStatistics(data.statistics || null);
    } catch (error) {
      console.error('Error fetching crawl status:', error);
      toast.error("크롤링 상태를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrawlStatus();
  }, []);

  // 수동 크롤링 실행
  const handleManualCrawl = async (type: string = 'all') => {
    setIsCrawling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다");
        return;
      }

      toast.info(`${type === 'all' ? '전체' : type} 크롤링을 시작합니다...`);

      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        throw new Error('Crawl failed');
      }

      const result = await response.json();
      
      toast.success(
        `크롤링 완료! 발견: ${result.itemsFound}개, 추가: ${result.itemsAdded}개, 업데이트: ${result.itemsUpdated}개`
      );

      // 상태 새로고침
      await fetchCrawlStatus();
    } catch (error) {
      console.error('Crawl error:', error);
      toast.error("크롤링 중 오류가 발생했습니다");
    } finally {
      setIsCrawling(false);
    }
  };

  // 키워드 검색 크롤링 실행
  const handleKeywordCrawl = async () => {
    if (!keyword.trim()) {
        toast.error("검색어를 입력해주세요");
        return;
    }

    setIsCrawling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다");
        return;
      }

      toast.info(`'${keyword}' 관련 정보를 검색 및 수집합니다... (Web + MCP)`);

      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ keyword: keyword.trim(), type: 'contest' }),
      });

      if (!response.ok) {
        throw new Error('Crawl failed');
      }

      const result = await response.json();
      
      toast.success(
        `검색 완료! 발견: ${result.itemsFound}개, 추가: ${result.itemsAdded}개`
      );
      setKeyword("");
      await fetchCrawlStatus();
    } catch (error) {
      console.error('Keyword crawl error:', error);
      toast.error("검색 크롤링 실패. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsCrawling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[#16A34A]" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/recruit"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          채용/공모전 관리로 돌아가기
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          채용/공모전 크롤링 관리
        </h1>
        <p className="text-gray-600">
          자동 크롤링 현황을 확인하고 수동으로 크롤링을 실행할 수 있습니다
        </p>
      </div>

      {/* 통계 카드 (기존 유지) */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Database className="w-4 h-4" />
                전체 항목
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{statistics.total}</div>
              <p className="text-xs text-gray-500 mt-1">활성 항목 수</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                크롤링 항목
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#16A34A]">{statistics.crawled}</div>
              <p className="text-xs text-gray-500 mt-1">자동 수집된 항목</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                수동 항목
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{statistics.manual}</div>
              <p className="text-xs text-gray-500 mt-1">관리자가 추가한 항목</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                카테고리별
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">채용</span>
                  <span className="font-semibold">{statistics.byType.job}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">공모전</span>
                  <span className="font-semibold">{statistics.byType.contest}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">이벤트</span>
                  <span className="font-semibold">{statistics.byType.event}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 키워드 검색 크롤링 (신규 기능 - MCP & Web Search) */}
      <Card className="mb-6 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            키워드 검색 크롤링 (MCP & Web Search)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
             <Input 
               placeholder="키워드 입력 (예: 카카오, 오설록 AI, 해커톤...)" 
               value={keyword}
               onChange={(e) => setKeyword(e.target.value)}
               className="max-w-md bg-white"
               onKeyDown={(e) => e.key === 'Enter' && handleKeywordCrawl()}
             />
             <Button 
               onClick={handleKeywordCrawl}
               disabled={isCrawling || !keyword.trim()}
               className="bg-blue-600 hover:bg-blue-700 text-white"
             >
               {isCrawling ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
               검색 및 수집 실행
             </Button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            💡 <strong>위비티, 네이버 뉴스, 해보자고(MCP)</strong>를 통해 해당 키워드와 관련된 공모전/활동을 정밀 검색하여 목록에 추가합니다.
          </p>
        </CardContent>
      </Card>

      {/* 수동 크롤링 버튼 (기존 유지) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>카테고리별 수동 크롤링</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleManualCrawl('all')}
              disabled={isCrawling}
              className="bg-[#16A34A] hover:bg-[#41a3aa]"
            >
              {isCrawling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  크롤링 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  전체 크롤링
                </>
              )}
            </Button>
            <Button
              onClick={() => handleManualCrawl('job')}
              disabled={isCrawling}
              variant="outline"
            >
              채용 크롤링
            </Button>
            <Button
              onClick={() => handleManualCrawl('contest')}
              disabled={isCrawling}
              variant="outline"
            >
              공모전 크롤링
            </Button>
            <Button
              onClick={() => handleManualCrawl('event')}
              disabled={isCrawling}
              variant="outline"
            >
              이벤트 크롤링
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            💡 자동 크롤링은 매일 오전 6시에 실행됩니다. 수동으로 즉시 실행하려면 위 버튼을 클릭하세요.
          </p>
        </CardContent>
      </Card>

      {/* 크롤링 로그 (기존 유지) */}
      <Card>
        <CardHeader>
          <CardTitle>크롤링 히스토리</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>크롤링 기록이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {log.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-semibold text-gray-900">
                          {log.type === 'all' ? '전체' : log.type} 크롤링
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === 'success' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">발견:</span>
                          <span className="ml-1 font-medium">{log.items_found}개</span>
                        </div>
                        <div>
                          <span className="text-gray-500">추가:</span>
                          <span className="ml-1 font-medium text-green-600">{log.items_added}개</span>
                        </div>
                        <div>
                          <span className="text-gray-500">업데이트:</span>
                          <span className="ml-1 font-medium text-blue-600">{log.items_updated}개</span>
                        </div>
                        <div>
                          <span className="text-gray-500">소요시간:</span>
                          <span className="ml-1 font-medium">{(log.duration_ms / 1000).toFixed(2)}초</span>
                        </div>
                      </div>

                      {log.error_message && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          오류: {log.error_message}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm text-gray-500 ml-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 스케줄 정보 (기존 유지) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>자동 크롤링 스케줄</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">매일 오전 6시</p>
                <p className="text-sm text-gray-600">전체 카테고리 자동 크롤링</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Vercel Cron Jobs를 사용하여 자동으로 실행됩니다. 
              설정을 변경하려면 <code className="bg-gray-100 px-2 py-1 rounded">vercel.json</code> 파일을 수정하세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
