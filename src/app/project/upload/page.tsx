"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, 
  faCamera, 
  faImage, 
  faTrash, 
  faPlus,
  faStar
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/lib/auth/AuthContext";
import { uploadImage } from "@/lib/supabase/storage";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, LayoutTemplate, Zap, BarChart3 } from "lucide-react";
import dynamic from "next/dynamic";
import { genreCategories, fieldCategories } from "@/lib/categoryMap";
import { Editor } from '@tiptap/react'; 

// Dynamic Imports
const TiptapEditor = dynamic(() => import("@/components/editor/TiptapEditor.client"), { ssr: false });
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { getProjectVersions, ProjectVersion } from "@/lib/versions";
import { ChevronDown, ChevronUp, History, Rocket, Edit } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ProjectUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // 모드 설정
  const mode = searchParams.get('mode');
  const editId = searchParams.get('edit');
  const projectId = searchParams.get('projectId'); // For New Episode
  const isVersionMode = mode === 'version' && !!projectId;
  const isEditMode = !!editId;
  
  // 기본 정보 상태
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]); // New State for Fields
  const [showInDiscover, setShowInDiscover] = useState(true);
  const [showInGrowth, setShowInGrowth] = useState(false); 
  const [auditDeadline, setAuditDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); 
    return d.toISOString().split('T')[0];
  });
  
  // 평가 항목
  const [customCategories, setCustomCategories] = useState<any[]>([
    { id: 'score_1', label: '기획력', desc: '문제해결에 대한 논리적인 접근', sticker: '/review/s1.png' },
    { id: 'score_2', label: '완성도', desc: '전체적인 완성도가 높은가?', sticker: '/review/s2.png' },
    { id: 'score_3', label: '시장성', desc: '사용가치 및 잠재력이 있는가?', sticker: '/review/s3.png' },
    { id: 'score_4', label: '독창성', desc: '아이디어가 참신한가?', sticker: '/review/s4.png' }
  ]);
  
  // 스티커 폴
  const [pollOptions, setPollOptions] = useState<any[]>([
    { id: 'p1', label: '당장 쓸게요!', desc: '매우 기대되는 프로젝트입니다.', image_url: '/review/a1.jpeg' },
    { id: 'p2', label: '조금 아쉬워요', desc: '개선이 필요해 보입니다.', image_url: '/review/a2.jpeg' },
    { id: 'p3', label: '더 연구해 주세요', desc: '방향성 재검토가 필요합니다.', image_url: '/review/a3.jpeg' }
  ]);
  
  // 심층 질문
  const [auditQuestions, setAuditQuestions] = useState<string[]>([
    "가장 인상적인 부분은 어디인가요?",
    "가장 개선이 시급한 부분은 어디인가요?",
    "종합적으로 평가해 주세요."
  ]);

  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [baseProject, setBaseProject] = useState<any>(null);
  const [versionName, setVersionName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  // 데이터 로딩 및 초기 설정
  useEffect(() => {
    if (mode === 'audit') {
      setShowInGrowth(true);
      setShowInDiscover(true);
    }
    
    if (isEditMode || isVersionMode) {
      const loadProject = async () => {
        const idToFetch = isEditMode ? editId : projectId;
        try {
          const res = await fetch(`/api/projects/${idToFetch}`);
          const data = await res.json();
          if (data.project) {
            const p = data.project;
            setBaseProject(p);
            
            // For Edit Mode: Load everything
            if (isEditMode) {
                setTitle(p.title || "");
                setContent(p.content_text || "");
                setCoverPreview(p.thumbnail_url);
                const cData = typeof p.custom_data === 'string' ? JSON.parse(p.custom_data) : p.custom_data;
                setSelectedGenres(cData?.genres || []);
                setSelectedFields(cData?.fields || []); // Load Fields
                if (p.audit_deadline) setAuditDeadline(p.audit_deadline.split('T')[0]);
                if (cData?.audit_config) {
                  const cfg = cData.audit_config;
                  if (cfg.categories) setCustomCategories(cfg.categories);
                  if (cfg.poll) setPollOptions(cfg.poll.options || []);
                  if (cfg.questions) setAuditQuestions(cfg.questions);
                }
                setShowInGrowth(p.is_growth_requested || cData?.is_feedback_requested || false);
                setShowInDiscover(p.visibility === 'public');
            } 
            
            // For Version Mode: Just copy basic metadata (genres, etc)
            if (isVersionMode) {
                setTitle(p.title || "");
                setCoverPreview(p.thumbnail_url); // 기본적으로 프로젝트 썸네일을 커버로 사용
                const cData = typeof p.custom_data === 'string' ? JSON.parse(p.custom_data) : p.custom_data;
                setSelectedGenres(cData?.genres || []);
                // Load existing versions
                const vList = await getProjectVersions(projectId!);
                setVersions(vList);
                setVersionName(`v1.0.${vList.length + 1}`);

                // Load latest version content by default
                if (vList.length > 0) {
                    setContent(vList[0].content_html || vList[0].content_text || "");
                }
            }
          }
        } catch (e) {
          console.error("Failed to load project", e);
          toast.error("프로젝트 정보를 불러오는데 실패했습니다.");
        }
      };
      loadProject();
    }

    // [New] Auto-save & RestoreDraft Logic
    // Only applied when NOT in specific edit mode (to avoid overwriting real data with stale local data)
    if (!isEditMode && !isVersionMode) {
        // 1. Restore
        const savedDraft = localStorage.getItem("project_draft");
        if (savedDraft) {
            try {
                const { title: sTitle, content: sContent, timestamp } = JSON.parse(savedDraft);
                // Check if draft is recent (optional, but good UX)
                const isRecent = (Date.now() - timestamp) < 24 * 60 * 60 * 1000; // 24h
                
                if (sTitle || sContent) {
                     toast("작성 중인 임시 저장본이 있습니다.", {
                         action: {
                             label: "불러오기",
                             onClick: () => {
                                 if (sTitle) setTitle(sTitle);
                                 if (sContent) {
                                     setContent(sContent);
                                     editor?.commands.setContent(sContent); // Sync Tiptap
                                 }
                                 toast.success("임시 저장된 내용을 불러왔습니다.");
                             }
                         },
                         duration: 5000,
                     });
                }
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }
  }, [editId, mode, projectId, editor]); // Added editor dependency for restoration

  // 2. Auto-save Effect
  useEffect(() => {
     if (isEditMode || isVersionMode) return; // Don't auto-save in edit/version mode to avoid conflicts

     const timer = setTimeout(() => {
         if (title || content) {
             const draft = {
                 title,
                 content,
                 timestamp: Date.now()
             };
             localStorage.setItem("project_draft", JSON.stringify(draft));
             // console.log("Auto-saved draft");
         }
     }, 3000); // Save every 3 seconds of inactivity

     return () => clearTimeout(timer);
  }, [title, content, isEditMode, isVersionMode]);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("제목을 입력해주세요.");
    if (isVersionMode && !versionName.trim()) return toast.error("버전 이름을 입력해주세요.");
    // if (selectedGenres.length === 0 && selectedFields.length === 0) return toast.error("최소 1개의 장르 또는 분야를 선택해주세요.");
    
    setIsSubmitting(true);
    try {
      let coverUrl = coverPreview;
      if (coverImage) {
        coverUrl = await uploadImage(coverImage);
      }

      // If Version Mode: Post to versions endpoint
      if (isVersionMode) {
          const versionData = {
              version_name: versionName,
              content_text: content,
              content_html: content, // Tiptap content is HTML anyway
              changelog: `Published new episode: ${versionName}`,
              images: [] // images are usually embedded in content_text as <img> tags
          };

          const res = await fetch(`/api/projects/${projectId}/versions`, {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${ (await supabase.auth.getSession()).data.session?.access_token }`
              },
              body: JSON.stringify(versionData),
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err?.error || "에피소드 등록 실패");
          }

          toast.success("새 에피소가 발행되었습니다!");
          router.push(`/project/${projectId}`);
          return;
      }

      const projectData = {
        title,
        content_text: content,
        thumbnail_url: coverUrl,
        visibility: showInDiscover ? 'public' : 'unlisted',
        category_id: selectedGenres.length > 0 ? selectedGenres[0] : 1, // Default to 1 if only field selected
        audit_deadline: showInGrowth ? auditDeadline : null,
        custom_data: {
          genres: selectedGenres,
          fields: selectedFields, // Save Fields
          show_in_discover: showInDiscover,
          show_in_growth: showInGrowth,
          audit_config: showInGrowth ? {
            type: 'image',
            mediaA: coverUrl, 
            isAB: false,
            categories: customCategories,
            poll: { desc: "이 작품에 대해 어떻게 생각하시나요?", options: pollOptions },
            questions: auditQuestions
          } : null
        },
        is_growth_requested: showInGrowth
      } as any;

      const session = (await supabase.auth.getSession()).data.session;
      const endpoint = isEditMode ? `/api/projects/${editId}` : "/api/projects";
      const res = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(isEditMode ? { ...projectData, project_id: editId } : projectData),
      });

      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || errData.details || "등록 실패");
      }
      
      // Clear Draft on Success
      localStorage.removeItem("project_draft");

      toast.success(showInGrowth ? "전문 피드백 설정이 완료되었습니다!" : "프로젝트가 발행되었습니다!");
      router.push(showInGrowth ? "/growth" : "/discover");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xl font-bold text-gray-900">프로젝트를 안전하게 등록하고 있습니다...</p>
      </div>
    );
  }

  const renderFeedbackSettings = () => {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">🎯</div>
                  <div>
                     <h2 className="text-2xl font-black">피드백 항목 상세 설정</h2>
                     <p className="text-orange-200/60 text-xs font-bold uppercase tracking-widest mt-0.5">Customizing Professional Feedback</p>
                  </div>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-white/40 uppercase mb-1">피드백 마감일</span>
                  <input 
                    type="date" 
                    value={auditDeadline} 
                    onChange={e => setAuditDeadline(e.target.value)}
                    className="bg-white/10 border-none rounded-lg px-3 py-1 text-xs font-bold text-orange-400 outline-none focus:ring-1 focus:ring-orange-500"
                  />
               </div>
            </div>
         </div>

         {/* 1. Michelin Categories */}
         <section className="space-y-8">
            <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-xl"><Zap size={20} /></div>
                  <h3 className="text-xl font-black text-gray-900">1. 평가 항목 설정 (레이더 차트)</h3>
               </div>
               <Button variant="outline" onClick={() => setCustomCategories([...customCategories, { id: `cat-${Date.now()}`, label: "", desc: "", sticker: "" }])} disabled={customCategories.length >= 6} className="rounded-xl font-bold">항목 추가</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {customCategories.map((cat, idx) => (
                  <div key={cat.id} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm relative group">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-200">
                           <FontAwesomeIcon icon={faStar} className="text-gray-300" />
                        </div>
                        <div className="flex-1 space-y-1">
                           <input value={cat.label} onChange={e => {
                              const next = [...customCategories];
                              next[idx].label = e.target.value;
                              setCustomCategories(next);
                           }} className="font-black text-gray-900 outline-none w-full bg-transparent text-lg placeholder:text-gray-200" placeholder="평가 항목" />
                           <input value={cat.desc} onChange={e => {
                              const next = [...customCategories];
                              next[idx].desc = e.target.value;
                              setCustomCategories(next);
                           }} className="text-xs text-gray-400 outline-none w-full bg-transparent font-bold" placeholder="가이드라인" />
                        </div>
                        <button onClick={() => setCustomCategories(customCategories.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><FontAwesomeIcon icon={faTrash} /></button>
                     </div>
                  </div>
               ))}
            </div>
         </section>

          {/* 2. Sticker Poll */}
          <section className="space-y-8">
             <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-xl"><BarChart3 size={20} /></div>
                   <h3 className="text-xl font-black text-gray-900">2. 스티커 투표 설정</h3>
                </div>
                <Button 
                   variant="outline" 
                   onClick={() => setPollOptions([...pollOptions, { id: `p${Date.now()}`, label: "", desc: "", image_url: "" }])} 
                   disabled={pollOptions.length >= 6} 
                   className="rounded-xl font-bold gap-2"
                >
                   <FontAwesomeIcon icon={faPlus} size="sm" /> 옵션 추가
                </Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pollOptions.map((opt, idx) => (
                   <div key={opt.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 relative group shadow-sm hover:shadow-lg transition-all">
                      <button 
                         onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                         className="absolute top-6 right-6 w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      >
                         <FontAwesomeIcon icon={faTrash} size="xs" />
                      </button>
                      
                      <div className="aspect-square bg-gray-50 rounded-2xl mb-6 flex items-center justify-center border-2 border-dashed border-gray-100 overflow-hidden relative">
                         {opt.image_url ? (
                           <>
                             <img src={opt.image_url} className="w-full h-full object-cover" />
                             <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                <span className="text-white text-[10px] font-black uppercase">Change</span>
                                <input type="file" className="hidden" onChange={async e => {
                                   const file = e.target.files?.[0];
                                   if (file) {
                                      const url = await uploadImage(file);
                                      const next = [...pollOptions];
                                      next[idx].image_url = url;
                                      setPollOptions(next);
                                   }
                                }} />
                             </label>
                           </>
                         ) : (
                           <label className="text-center cursor-pointer hover:bg-gray-100 w-full h-full flex flex-col items-center justify-center transition-colors">
                              <FontAwesomeIcon icon={faImage} className="text-slate-300 text-xl mb-2" />
                              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Upload Sticker</p>
                              <input type="file" className="hidden" onChange={async e => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                    const url = await uploadImage(file);
                                    const next = [...pollOptions];
                                    next[idx].image_url = url;
                                    setPollOptions(next);
                                 }
                              }} />
                           </label>
                         )}
                      </div>
                      <input value={opt.label} onChange={e => {
                         const next = [...pollOptions];
                         next[idx].label = e.target.value;
                         setPollOptions(next);
                      }} className="w-full font-black text-gray-900 outline-none text-center text-lg mb-2 bg-transparent placeholder:text-slate-200" placeholder="옵션 이름 (ex. 합격!)" />
                      <textarea value={opt.desc} onChange={e => {
                         const next = [...pollOptions];
                         next[idx].desc = e.target.value;
                         setPollOptions(next);
                      }} className="w-full text-xs text-gray-400 text-center bg-transparent resize-none font-bold placeholder:text-slate-200" rows={2} placeholder="짧은 설명" />
                   </div>
                ))}
             </div>
          </section>

          {/* 3. Deep Questions */}
          <section className="space-y-8">
             <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center text-xl">💬</div>
                   <h3 className="text-xl font-black text-gray-900">3. 심층 피드백 질문</h3>
                </div>
                <Button 
                   variant="outline" 
                   onClick={() => setAuditQuestions([...auditQuestions, ""])} 
                   disabled={auditQuestions.length >= 5} 
                   className="rounded-xl font-bold gap-2"
                >
                   <FontAwesomeIcon icon={faPlus} size="sm" /> 질문 추가
                </Button>
             </div>
             <div className="space-y-4">
                {auditQuestions.map((q, idx) => (
                   <div key={idx} className="flex gap-4 group items-center">
                      <div className="shrink-0 w-14 h-14 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-xl shadow-slate-200">Q{idx+1}</div>
                      <div className="flex-1 relative">
                         <Input 
                            value={q}
                            onChange={e => {
                               const next = [...auditQuestions];
                               next[idx] = e.target.value;
                               setAuditQuestions(next);
                            }}
                            className="h-14 rounded-2xl border-2 border-slate-50 focus:border-slate-900 text-lg font-bold transition-all px-6 placeholder:text-slate-200"
                            placeholder="평가자에게 묻고 싶은 질문을 입력하세요"
                         />
                         {auditQuestions.length > 1 && (
                            <button 
                               onClick={() => setAuditQuestions(auditQuestions.filter((_, i) => i !== idx))}
                               className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                               <FontAwesomeIcon icon={faTrash} />
                            </button>
                         )}
                      </div>
                   </div>
                ))}
             </div>
          </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 h-16">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-black transition-colors flex items-center gap-2">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span className="text-sm font-bold uppercase tracking-wider">Back</span>
        </button>
        <h1 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">
          {showInGrowth ? "포트폴리오 & 전문 피드백" : isVersionMode ? "새 버전 등록" : "프로젝트 등록"}
        </h1>
        <div className="w-10" />
      </header>
      
      <div className="flex justify-center min-h-[calc(100vh-64px)] relative bg-[#fafafa]">
        <div className="flex w-full max-w-[1600px] relative">
        
        {/* Left Sidebar - Versions / Navigation */}
        <aside className="hidden md:block w-[260px] flex-shrink-0 sticky top-[100px] self-start z-30 h-fit">
           <div className="pt-12 px-6 space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock size={12} /> History
                 </h3>
                 {isVersionMode ? (
                    <div className="space-y-4">
                       <div className="p-3 bg-slate-100/50 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Editor Mode</p>
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                             <Rocket size={14} className="text-blue-500" /> New Episode
                          </p>
                          <input 
                            value={versionName}
                            onChange={e => setVersionName(e.target.value)}
                            placeholder="버전 이름 (ex: v1.0.2)"
                            className="mt-2 w-full bg-white border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
                          />
                       </div>

                       <div className="pt-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                             <History size={12} /> Episode History
                          </p>
                          {versions.length > 0 ? (
                             <Accordion type="single" collapsible className="space-y-2">
                                {versions.map((v, idx) => (
                                   <AccordionItem key={v.id} value={`v-${v.id}`} className="border-none">
                                      <AccordionTrigger className="p-3 bg-white rounded-xl border border-slate-100 hover:no-underline py-3 px-4 group/trigger">
                                         <div className="flex flex-col items-start text-left gap-0.5">
                                            <p className="text-xs font-black text-slate-800 flex items-center gap-2">
                                               {v.version_name}
                                               {idx === 0 && <span className="text-[8px] bg-green-100 text-green-600 px-1 rounded">LATEST</span>}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">{new Date(v.created_at).toLocaleDateString()}</p>
                                         </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="p-0 bg-slate-50/50 rounded-b-xl border-x border-b border-slate-100 mt-[-8px] overflow-hidden">
                                         <div className="p-4 max-h-[200px] overflow-y-auto no-scrollbar bg-white/50">
                                            <div 
                                              className="text-[11px] text-slate-500 prose-xs prose-p:my-1 prose-headings:my-1"
                                              dangerouslySetInnerHTML={{ __html: v.content_html || "" }}
                                            />
                                         </div>
                                         <div className="p-2 bg-slate-100/50 flex gap-1">
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              className="flex-1 h-8 text-[10px] font-black text-blue-600 hover:text-white hover:bg-blue-600 transition-all rounded-lg"
                                              onClick={() => {
                                                  if (editor) {
                                                      const contentToLoad = v.content_html || v.content_text || "";
                                                      editor.commands.setContent(contentToLoad);
                                                      setContent(contentToLoad);
                                                      
                                                      // 에피소드에 저장된 이미지가 있다면 커버 이미지로도 제안/적용
                                                      if (v.images && v.images.length > 0) {
                                                          setCoverPreview(v.images[0]);
                                                      }
                                                      
                                                      toast.success(`'${v.version_name}' 내용을 불러왔습니다.`);
                                                  }
                                              }}
                                            >
                                               내용 불러오기
                                            </Button>
                                         </div>
                                      </AccordionContent>
                                   </AccordionItem>
                                ))}
                             </Accordion>
                          ) : (
                             <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                                <p className="text-[10px] text-slate-400 font-bold">이전 에피소드 없음</p>
                             </div>
                          )}
                       </div>
                       
                       <div className="pt-6 border-t border-slate-100">
                          <button 
                            onClick={() => router.push(`/project/upload?edit=${projectId}`)}
                            className="w-full py-3 px-4 rounded-xl border border-slate-200 text-[10px] font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                             <Edit size={12} /> 프로젝트 자체 수정하기
                          </button>
                          <p className="text-[9px] text-slate-300 mt-2 text-center leading-relaxed">
                            새 에피소드 발행이 아닌, 기존 프로젝트 정보(제목, 썸네일 등)를 수정합니다.
                          </p>
                       </div>
                    </div>
                 ) : (
                    <div className="text-center py-8 opacity-50">
                       <LayoutTemplate className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                       <p className="text-xs text-slate-400">새 프로젝트 작성 중</p>
                    </div>
                 )}
              </div>
              
              <div className="bg-orange-50/50 rounded-2xl p-5 border border-orange-100/50">
                 <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    Tip
                 </h3>
                 <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    <strong className="text-orange-600">Enter</strong> 키로 단락을 나누고, <strong className="text-orange-600">/</strong> 키를 눌러 메뉴를 열 수 있습니다.
                 </p>
              </div>
           </div>
        </aside>

        {/* Center content */}
        <main className="flex-1 w-full max-w-[900px] mx-auto py-12 px-6 bg-white shadow-sm min-h-screen border-x border-slate-50 relative">
           {mode === 'audit' && (
              <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-lg">🌱</div>
                    <div>
                       <p className="text-sm font-bold text-gray-900">전문가 피드백 요청 모드</p>
                       <p className="text-xs text-gray-500">작품을 등록하면 자동으로 성장하기 메뉴에 노출됩니다.</p>
                    </div>
                 </div>
                 <div className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-400">AUTO-ON</div>
              </div>
           )}

           {/* Title Input Section */}
           <div className="space-y-2 group mb-12">
             <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Project Title</span>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{title.length} / 50</span>
             </div>
             <Input 
               autoFocus
               placeholder="프로젝트 제목을 입력하세요" 
               className="h-20 text-4xl font-black border-none bg-transparent focus-visible:ring-0 px-0 placeholder:text-slate-100 transition-all caret-orange-500" 
               value={title}
               maxLength={50}
               onChange={e => setTitle(e.target.value)}
             />
             <div className="h-1 bg-slate-50 relative overflow-hidden rounded-full">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(title.length / 50) * 100}%` }}
                  className="absolute h-full bg-slate-900 origin-left transition-all duration-300"
                />
             </div>
           </div>

           {/* Editor */}
           <div className="min-h-[500px]">
              <TiptapEditor 
                content={content} 
                onChange={setContent} 
                onEditorReady={setEditor}
              />
           </div>

           <div className="h-px bg-slate-100 my-16" />

           <div className="space-y-16 pb-20">
              {/* Basic Settings */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><FontAwesomeIcon icon={faCamera} className="text-slate-300"/> 커버 이미지</h2>
                    <div className="aspect-video bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group hover:border-orange-500 transition-colors">
                       {coverPreview ? (
                         <img src={coverPreview} className="w-full h-full object-cover" />
                       ) : (
                         <div className="text-center">
                            <p className="text-sm text-gray-400 font-bold">대표 이미지를 등록하세요</p>
                         </div>
                       )}
                       <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="px-4 py-2 bg-white text-black font-bold rounded-lg shadow-sm hover:bg-gray-100 transition-colors">이미지 선택</div>
                           <input type="file" className="hidden" accept="image/*" onChange={async e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Show preview immediately before upload if possible, or just set file
                                setCoverImage(file); // Save file for submit
                                
                                // Optional: Upload immediately for preview (as established pattern)
                                try {
                                    const url = await uploadImage(file);
                                    setCoverPreview(url);
                                } catch (err) {
                                    toast.error("이미지 업로드 실패");
                                }
                              }
                           }} />
                        </label>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-4">
                        <h2 className="text-xl font-black text-gray-900">장르 (Genre)</h2>
                        <div className="flex flex-wrap gap-2">
                           {genreCategories.map(cat => (
                             <button 
                                key={cat.id} 
                                onClick={() => setSelectedGenres(prev => prev.includes(cat.id) ? prev.filter(i => i !== cat.id) : [...prev, cat.id])} 
                                className={cn("px-4 py-2 rounded-xl border-2 transition-all font-bold text-sm", selectedGenres.includes(cat.id) ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" : "border-gray-100 text-gray-400 hover:border-gray-300 bg-white")}
                             >
                               {cat.label}
                             </button>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h2 className="text-xl font-black text-gray-900">산업 분야 (Expertise)</h2>
                        <div className="flex flex-wrap gap-2">
                           {fieldCategories.map(cat => (
                             <button 
                                key={cat.id} 
                                onClick={() => setSelectedFields(prev => prev.includes(cat.id) ? prev.filter(i => i !== cat.id) : [...prev, cat.id])} 
                                className={cn("px-4 py-2 rounded-xl border-2 transition-all font-bold text-sm", selectedFields.includes(cat.id) ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200" : "border-gray-100 text-gray-400 hover:border-gray-300 bg-white")}
                             >
                               {cat.label}
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </section> 

              {/* Visibility Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                    onClick={() => setShowInDiscover(!showInDiscover)}
                    className={cn("p-6 rounded-[2rem] text-left transition-all border-2", showInDiscover ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-gray-100 text-gray-400")}
                 >
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Public Feed</p>
                    <h3 className="text-lg font-black">발견하기 메뉴에 등록</h3>
                 </button>
                 <button 
                    onClick={() => setShowInGrowth(!showInGrowth)}
                    className={cn("p-6 rounded-[2rem] text-left transition-all border-2", showInGrowth ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-100 text-gray-400")}
                 >
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Feedback Mode</p>
                    <h3 className="text-lg font-black">성장하기 메뉴에 등록</h3>
                 </button>
              </div>

              <AnimatePresence>
                 {showInGrowth && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                       {renderFeedbackSettings()}
                    </motion.div>
                 )}
              </AnimatePresence>

              <div className="flex justify-end pt-8">
                <Button disabled={isSubmitting} onClick={handleSubmit} className="h-20 px-24 rounded-full bg-black text-white text-2xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto">
                   {isSubmitting ? "발행 중..." : "발행하기"}
                </Button>
              </div>
           </div>
        </main>

        {/* Right Sidebar - Toolbox */}
        <aside className="hidden md:block w-[300px] flex-shrink-0 sticky top-[100px] self-start z-30 h-fit">
           <div className="pt-12 pr-6">
           {editor && (
              <EditorSidebar 
                 onAddText={() => editor.chain().focus().setParagraph().run()}
                 onAddImage={() => document.querySelector<HTMLInputElement>('input[type="file"].hidden')?.click()}
                 onAddVideo={() => {
                    const url = window.prompt("YouTube URL:");
                    if(url) {
                        try {
                            const newUrl = new URL(url);
                            editor.commands.setYoutubeVideo({ src: url });
                        } catch (e) {
                            toast.error("올바른 YouTube URL을 입력해주세요.");
                        }
                    }
                 }}
                 onStyleClick={() => toast.info("준비 중")}
                 onSettingsClick={() => toast.info("준비 중")}
                 isGrowthMode={showInGrowth}
              />
           )}
           </div>
        </aside>

        </div>
      </div>
    </div>
  );
}
