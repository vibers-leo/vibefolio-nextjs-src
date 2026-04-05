"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { genreCategories, fieldCategories } from "@/lib/categoryMap";
import { GENRE_TO_CATEGORY_ID } from "@/lib/constants";
import {
  Sparkles, Loader2, ExternalLink, Image as ImageIcon,
  ChevronRight, PenLine, Globe, Check, Github, Code2, Upload, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { uploadImage } from "@/lib/supabase/storage";

interface ExtractedData {
  title: string;
  description: string;
  aiDescription: string;
  thumbnailUrl: string;
  sourceUrl: string;
  siteName: string;
  keywords: string[];
  techStack?: string[];
  features?: string[];
  projectType?: string;
  suggestedGenre?: string;
  suggestedFields?: string[];
  isGitHub?: boolean;
  repoStats?: {
    stars: number;
    language: string;
    topics: string[];
  };
}

type Step = "url" | "edit" | "category";

export default function QuickPostPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractStage, setExtractStage] = useState("");
  const [publishing, setPublishing] = useState(false);

  // 추출된 데이터 (수정 가능)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailError, setThumbnailError] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [siteName, setSiteName] = useState("");

  // AI 분석 결과
  const [techStack, setTechStack] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [projectType, setProjectType] = useState("");
  const [isGitHub, setIsGitHub] = useState(false);
  const [repoStats, setRepoStats] = useState<{stars: number; language: string; topics: string[]} | null>(null);

  // 카테고리 선택
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // === URL 분석 ===
  const handleExtract = async () => {
    if (!url.trim()) {
      toast.error("URL을 입력해주세요.");
      return;
    }

    // URL 형식 보정
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    setExtracting(true);
    setExtractStage("페이지 접속 중...");

    const stageTimers = [
      setTimeout(() => setExtractStage("콘텐츠 분석 중..."), 1500),
      setTimeout(() => setExtractStage("기술 스택 감지 중..."), 3000),
      setTimeout(() => setExtractStage("AI 소개글 생성 중..."), 5000),
    ];

    try {
      const res = await fetch("/api/projects/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const data: ExtractedData = await res.json();

      if (!res.ok) {
        throw new Error((data as any).error || "URL 분석에 실패했습니다.");
      }

      setTitle(data.title || "");
      setDescription(data.aiDescription || data.description || "");
      setThumbnailUrl(data.thumbnailUrl || "");
      setThumbnailError(false);
      setSourceUrl(data.sourceUrl || normalizedUrl);
      setSiteName(data.siteName || "");

      // AI 분석 결과 설정
      setTechStack(data.techStack || []);
      setFeatures(data.features || []);
      setProjectType(data.projectType || "");
      setIsGitHub(data.isGitHub || false);
      setRepoStats(data.repoStats || null);

      // AI 추천 카테고리 설정
      if (data.suggestedGenre) {
        setSelectedGenre(data.suggestedGenre);
      }
      if (data.suggestedFields?.length) {
        setSelectedFields(data.suggestedFields);
      }

      setStep("edit");
      toast.success("AI 분석이 완료되었습니다!");
    } catch (err: any) {
      toast.error(err.message || "URL 분석에 실패했습니다.");
    } finally {
      stageTimers.forEach(clearTimeout);
      setExtracting(false);
      setExtractStage("");
    }
  };

  // === 게시하기 ===
  const handlePublish = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    setPublishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
        return;
      }

      const categoryId = selectedGenre
        ? (GENRE_TO_CATEGORY_ID[selectedGenre] || 11)
        : 11; // 기본: webapp

      const customData = {
        genres: selectedGenre ? [selectedGenre] : ["webapp"],
        fields: selectedFields,
        source_url: sourceUrl,
        site_name: siteName,
        show_in_discover: true,
        show_in_growth: false,
        quick_post: true,
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          content_text: description.trim(),
          thumbnail_url: thumbnailUrl,
          category_id: categoryId,
          rendering_type: "rich_text",
          custom_data: customData,
          visibility: "public",
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "게시에 실패했습니다.");
      }

      toast.success("프로젝트가 게시되었습니다!");
      router.push(`/project/${result.project_id || result.data?.project_id}`);
    } catch (err: any) {
      toast.error(err.message || "게시에 실패했습니다.");
    } finally {
      setPublishing(false);
    }
  };

  // === 로그인 체크 ===
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">로그인이 필요합니다</h2>
          <p className="text-gray-500">프로젝트를 등록하려면 먼저 로그인해주세요.</p>
          <Button onClick={() => router.push("/login")} className="bg-green-600 hover:bg-green-700">
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            프로젝트 빠른 등록
          </h1>
          <p className="text-gray-500">
            URL만 입력하면 AI가 소개글을 자동으로 만들어드려요
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {(["url", "edit", "category"] as Step[]).map((s, i) => {
            const labels = ["URL 입력", "내용 확인", "카테고리"];
            const isActive = step === s;
            const isDone =
              (s === "url" && step !== "url") ||
              (s === "edit" && step === "category");
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-green-600 text-white"
                      : isDone
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone && <Check size={12} className="inline mr-1" />}
                  {labels[i]}
                </div>
              </div>
            );
          })}
        </div>

        {/* === Step 1: URL 입력 === */}
        {step === "url" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe size={28} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">프로젝트 URL을 입력하세요</h2>
              <p className="text-sm text-gray-500 mb-3">배포된 웹사이트, GitHub 페이지, 노션 등 어디든 OK</p>
              <p className="text-xs text-gray-400">GitHub, Vercel, Netlify, Notion, 개인 도메인 등 어디든 지원</p>
            </div>

            <div className="space-y-4">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://my-awesome-project.vercel.app"
                className="h-14 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                onKeyDown={(e) => e.key === "Enter" && handleExtract()}
                autoFocus
              />

              <Button
                onClick={handleExtract}
                disabled={extracting || !url.trim()}
                className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-base font-bold"
              >
                {extracting ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    {extractStage || "분석 중..."}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="mr-2" />
                    AI로 자동 분석하기
                  </>
                )}
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <Link
                href="/project/upload"
                className="text-sm text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
              >
                <PenLine size={14} />
                상세 에디터로 직접 작성하기
              </Link>
            </div>
          </div>
        )}

        {/* === Step 2: 내용 확인/수정 === */}
        {step === "edit" && (
          <div className="space-y-6">
            {/* Analysis Summary Card */}
            {(techStack.length > 0 || features.length > 0 || projectType || (isGitHub && repoStats)) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-green-600" />
                  <h2 className="text-lg font-bold text-gray-900">AI 분석 결과</h2>
                </div>

                {/* Tech Stack Badges */}
                {techStack.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      감지된 기술 스택
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {techStack.map(tech => (
                        <span key={tech} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {features.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      핵심 특징
                    </label>
                    <div className="space-y-1.5">
                      {features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GitHub Stats (if applicable) */}
                {isGitHub && repoStats && (
                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-3 border-t border-gray-100 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Github size={14} />
                      <span>GitHub</span>
                    </div>
                    <span>⭐ {repoStats.stars.toLocaleString()}</span>
                    {repoStats.language && <span>{repoStats.language}</span>}
                    {repoStats.topics?.slice(0, 5).map(t => (
                      <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{t}</span>
                    ))}
                  </div>
                )}

                {/* Project Type Badge */}
                {projectType && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">프로젝트 유형: </span>
                    <span className="text-xs font-bold text-green-600 uppercase">{projectType}</span>
                  </div>
                )}
              </div>
            )}

            {/* Editable Content Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <h3 className="text-base font-bold text-gray-900">게시 내용</h3>

              {/* 썸네일 미리보기 */}
              {thumbnailUrl && !thumbnailError ? (
                <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video">
                  <img
                    src={thumbnailUrl}
                    alt="프로젝트 썸네일"
                    className="w-full h-full object-cover"
                    onError={() => setThumbnailError(true)}
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => { setThumbnailUrl(""); setThumbnailError(false); }}
                      className="bg-black/50 text-white text-xs px-2 py-1 rounded-md hover:bg-black/70"
                    >
                      제거
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 aspect-video flex items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors"
                  onClick={() => document.getElementById("quick-thumb-upload")?.click()}
                >
                  <div className="text-center text-gray-400 space-y-2 px-4">
                    {thumbnailError ? (
                      <>
                        <AlertCircle size={28} className="mx-auto text-amber-400" />
                        <p className="text-xs font-bold text-amber-600">오픈그래프 이미지를 불러올 수 없습니다</p>
                        <p className="text-[11px] text-gray-400">이미지를 직접 업로드해주세요 (클릭 또는 드래그)</p>
                      </>
                    ) : (
                      <>
                        <Upload size={28} className="mx-auto" />
                        <p className="text-xs font-bold">오픈그래프 이미지가 설정되지 않았습니다</p>
                        <p className="text-[11px]">클릭하여 대표 이미지를 직접 업로드하세요</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              <input
                type="file"
                id="quick-thumb-upload"
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    toast.info("이미지 업로드 중...");
                    const url = await uploadImage(file, "projects");
                    setThumbnailUrl(url);
                    setThumbnailError(false);
                    toast.success("이미지가 업로드되었습니다.");
                  } catch (err: any) {
                    toast.error("업로드 실패: " + err.message);
                  }
                  e.target.value = "";
                }}
              />

              {/* 제목 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  프로젝트 이름
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="프로젝트 이름을 입력해주세요"
                  className="h-12 text-lg font-bold rounded-xl"
                />
              </div>

              {/* 소개글 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  소개글 <span className="text-green-600">(AI 생성 — 자유롭게 수정하세요)</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="rounded-xl resize-none text-sm leading-relaxed"
                  placeholder="프로젝트를 소개해주세요..."
                />
              </div>

              {/* 출처 */}
              {sourceUrl && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <ExternalLink size={14} />
                  <span className="truncate">{sourceUrl}</span>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("url")}
                className="flex-1 h-11 rounded-xl"
              >
                다시 분석
              </Button>
              <Button
                onClick={() => setStep("category")}
                disabled={!title.trim()}
                className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 font-bold"
              >
                다음: 카테고리 선택
              </Button>
            </div>
          </div>
        )}

        {/* === Step 3: 카테고리 선택 + 게시 === */}
        {step === "category" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">카테고리를 선택해주세요</h2>

            {/* 장르 */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                장르 (1개 선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {genreCategories.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGenre(g.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative ${
                      selectedGenre === g.id
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {g.label}
                    {selectedGenre === g.id && genreCategories.find(cat => cat.id === selectedGenre)?.id === g.id && (
                      <span className="ml-1.5 text-xs opacity-75">AI 추천</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 분야 */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                분야 (복수 선택 가능, 선택 안해도 됩니다)
              </label>
              <div className="flex flex-wrap gap-2">
                {fieldCategories.map((f) => (
                  <button
                    key={f.id}
                    onClick={() =>
                      setSelectedFields((prev) =>
                        prev.includes(f.id)
                          ? prev.filter((id) => id !== f.id)
                          : [...prev, f.id]
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedFields.includes(f.id)
                        ? "bg-slate-800 text-white"
                        : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep("edit")}
                className="h-11 rounded-xl px-6"
              >
                이전
              </Button>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-base font-bold shadow-lg shadow-green-100"
              >
                {publishing ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    게시 중...
                  </>
                ) : (
                  "게시하기"
                )}
              </Button>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/project/upload"
                className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
              >
                <PenLine size={12} />
                상세 에디터로 전환하기
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
