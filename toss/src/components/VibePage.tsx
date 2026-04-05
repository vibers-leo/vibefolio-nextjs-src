import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Bookmark, ChevronRight, TrendingUp, Clock } from 'lucide-react';

type Category = '전체' | 'AI' | '생산성' | '디자인' | '커머스' | '엔터';

interface Service {
  id: string;
  name: string;
  tagline: string;
  category: Category;
  emoji: string;
  color: string;
  bg: string;
  editorComment: string;
  url: string;
  hot: boolean;
  daysAgo: number;
}

const SERVICES: Service[] = [
  {
    id: 'suno', name: 'Suno v4', tagline: '가사만 입력하면 완성된 노래가 뚝딱',
    category: 'AI', emoji: '🎵', color: '#8B5CF6', bg: '#F5F3FF',
    editorComment: '작곡 경험 없어도 1분 만에 진짜 같은 노래 완성. 유튜브 브이로그 BGM 용도로 폭발적 확산 중',
    url: 'https://suno.com', hot: true, daysAgo: 2,
  },
  {
    id: 'cursor', name: 'Cursor Agent', tagline: '말로 앱 만드는 AI 코드 에디터',
    category: 'AI', emoji: '⌨️', color: '#10B981', bg: '#ECFDF5',
    editorComment: '개발자 없어도 "이런 앱 만들어줘" 한 마디에 실제 작동하는 코드가 나옴. 비개발자 창업팀 필수템',
    url: 'https://cursor.com', hot: true, daysAgo: 1,
  },
  {
    id: 'gamma', name: 'Gamma AI', tagline: '텍스트 → 프레젠테이션 자동 생성',
    category: '생산성', emoji: '📊', color: '#3B82F6', bg: '#EFF6FF',
    editorComment: 'PPT 만드는 시간 90% 단축. 기획서 텍스트 붙여넣으면 디자인된 슬라이드로 변환. 직장인 필수',
    url: 'https://gamma.app', hot: false, daysAgo: 4,
  },
  {
    id: 'perplexity', name: 'Perplexity Pages', tagline: '검색하면 아티클이 자동 생성',
    category: 'AI', emoji: '🔍', color: '#0EA5E9', bg: '#F0F9FF',
    editorComment: '궁금한 주제 검색하면 출처 달린 긴 아티클이 생성됨. 블로그 포스팅 자동화에 활용하는 크리에이터 급증',
    url: 'https://perplexity.ai', hot: false, daysAgo: 3,
  },
  {
    id: 'canva-v2', name: 'Canva AI Dream Lab', tagline: '브랜드 톤 유지하며 이미지 생성',
    category: '디자인', emoji: '🎨', color: '#FF6B6B', bg: '#FFF5F5',
    editorComment: '업로드한 로고/팔레트 스타일을 학습해서 일관된 브랜드 이미지 무한 생성. 소상공인 SNS 운영 판도 변화',
    url: 'https://canva.com', hot: true, daysAgo: 0,
  },
  {
    id: 'heygen', name: 'HeyGen 3.0', tagline: '내 얼굴로 AI 영상 인플루언서',
    category: 'AI', emoji: '🎬', color: '#F59E0B', bg: '#FFFBEB',
    editorComment: '셀카 1장으로 말하는 영상 생성. 다국어 자동 더빙도 가능. 유튜브 쇼츠 제작 비용 0원 가능성',
    url: 'https://heygen.com', hot: false, daysAgo: 5,
  },
  {
    id: 'notion-ai', name: 'Notion AI 연구원', tagline: 'AI가 내 노션을 스스로 정리',
    category: '생산성', emoji: '📝', color: '#1F2937', bg: '#F9FAFB',
    editorComment: '노션에 쌓인 메모를 AI가 분석해서 액션아이템 자동 추출. 회의록 → 할일 → 일정 연결이 원클릭',
    url: 'https://notion.so', hot: false, daysAgo: 6,
  },
  {
    id: 'toss-ai', name: 'Napkin AI', tagline: '텍스트를 다이어그램으로 자동 변환',
    category: '생산성', emoji: '🗂️', color: '#6366F1', bg: '#EEF2FF',
    editorComment: '설명 글 붙여넣으면 플로우차트/마인드맵이 뚝딱. 개발 문서, 기획서 시각화에 최고',
    url: 'https://napkin.ai', hot: true, daysAgo: 1,
  },
];

const CATEGORIES: Category[] = ['전체', 'AI', '생산성', '디자인', '커머스', '엔터'];
const SAVED_KEY = 'vibefolio_saved_v1';

function loadSaved(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveSaved(s: Set<string>) { localStorage.setItem(SAVED_KEY, JSON.stringify([...s])); }

export default function VibePage() {
  const [category, setCategory] = useState<Category>('전체');
  const [saved, setSaved] = useState<Set<string>>(loadSaved);
  const [selected, setSelected] = useState<Service | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const toggleSave = (id: string) => {
    const next = new Set(saved);
    next.has(id) ? next.delete(id) : next.add(id);
    setSaved(next);
    saveSaved(next);
  };

  const list = SERVICES.filter(s => {
    if (showSaved) return saved.has(s.id);
    return category === '전체' || s.category === category;
  }).sort((a, b) => a.daysAgo - b.daysAgo);

  const todayPicks = SERVICES.filter(s => s.hot).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-500" />
            <span className="text-base font-black text-gray-900">바이브폴리오</span>
          </div>
          <button onClick={() => setShowSaved(!showSaved)}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${showSaved ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <Bookmark size={11} />저장됨 {saved.size > 0 && `(${saved.size})`}
          </button>
        </div>
        <p className="text-xs text-gray-400">요즘 뜨는 서비스, 에디터 코멘트로 한눈에</p>

        {/* 오늘의 픽 배너 */}
        {!showSaved && (
          <div className="mt-4 flex items-center gap-2 bg-indigo-50 rounded-2xl px-3 py-2">
            <TrendingUp size={14} className="text-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-600 font-semibold">오늘의 HOT 픽: {todayPicks.map(s => s.name).join(', ')}</p>
          </div>
        )}

        {/* 카테고리 필터 */}
        {!showSaved && (
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${category === c ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 리스트 */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-3">🔖</div>
            <p className="text-sm text-gray-400">저장한 서비스가 없어요</p>
          </div>
        ) : list.map((svc, i) => (
          <motion.div key={svc.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => setSelected(svc)}
            className="bg-white rounded-2xl p-4 border border-gray-100 cursor-pointer active:bg-gray-50">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: svc.bg }}>{svc.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-sm text-gray-900">{svc.name}</span>
                  {svc.hot && <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full font-bold">HOT</span>}
                  {svc.daysAgo === 0 && <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded-full font-bold">NEW</span>}
                </div>
                <p className="text-xs text-gray-500 mb-2">{svc.tagline}</p>
                <p className="text-xs text-gray-400 line-clamp-1 italic">"{svc.editorComment.slice(0, 40)}..."</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button onClick={e => { e.stopPropagation(); toggleSave(svc.id); }}
                  style={{ color: saved.has(svc.id) ? svc.color : '#D1D5DB' }}>
                  <Bookmark size={17} fill={saved.has(svc.id) ? 'currentColor' : 'none'} />
                </button>
                <div className="flex items-center gap-0.5 text-gray-300">
                  <Clock size={10} />
                  <span className="text-xs">{svc.daysAgo === 0 ? '오늘' : `${svc.daysAgo}일 전`}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 상세 모달 */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setSelected(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: selected.bg }}>{selected.emoji}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-gray-900">{selected.name}</span>
                    {selected.hot && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-bold">HOT</span>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: selected.bg, color: selected.color }}>{selected.category}</span>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-900 mb-2">{selected.tagline}</p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                <p className="text-xs text-indigo-500 font-bold mb-1">에디터 코멘트</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.editorComment}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => toggleSave(selected.id)}
                  className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-colors ${saved.has(selected.id) ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-700'}`}>
                  {saved.has(selected.id) ? '저장됨 ✓' : '저장하기'}
                </button>
                <a href={selected.url} target="_blank" rel="noreferrer"
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-1"
                  style={{ backgroundColor: selected.color }}>
                  바로 가보기 <ChevronRight size={15} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
