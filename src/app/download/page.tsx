import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Layers, Star, Users, Zap, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "앱 담아받기 | Vibefolio",
  description: "Vibefolio 앱으로 언제 어디서나 나만의 포트폴리오를 관리하세요. iOS · Android 출시 예정.",
  openGraph: {
    title: "Vibefolio 앱 출시 예정",
    description: "크리에이터를 위한 포트폴리오 플랫폼, 이제 앱으로 만나요.",
    images: [{ url: "/og-image.png" }],
  },
};

const features = [
  {
    icon: <Layers size={22} />,
    title: "간편한 포트폴리오 등록",
    desc: "URL 하나로 AI가 자동으로 프로젝트를 살펴보기하고 정리해줘요.",
  },
  {
    icon: <Star size={22} />,
    title: "전문가 평가 알림",
    desc: "내 작업물에 평가가 달리면 실시간으로 알려드려요.",
  },
  {
    icon: <Users size={22} />,
    title: "크리에이터 네트워크",
    desc: "디자이너, 개발자, 기획자가 모인 커뮤니티에서 영감을 얻으세요.",
  },
  {
    icon: <Zap size={22} />,
    title: "AI 썸네일 자동 만들기",
    desc: "프로젝트 소개 이미지를 AI가 자동으로 만들어줘요.",
  },
];

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm">
            <ArrowLeft size={16} />
            vibefolio.net
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/vibefolio2.png" alt="Vibefolio" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-slate-900 tracking-tight">Vibefolio</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-24 px-6 text-center bg-gradient-to-b from-indigo-50/60 to-white">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-8">
            <Sparkles size={14} />
            iOS · Android 출시 예정
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            포트폴리오를<br />
            <span className="text-indigo-600">손 안에서</span>
          </h1>
          <p className="text-xl text-slate-500 mb-12 leading-relaxed">
            언제 어디서나 내 작업물을 공유하고<br />
            전문가의 피드백을 받아보세요.
          </p>

          {/* 앱스토어 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              disabled
              className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-slate-900 text-white font-semibold text-sm opacity-60 cursor-not-allowed w-52 justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span>
                <span className="block text-[10px] font-normal opacity-70">출시 예정</span>
                App Store
              </span>
            </button>
            <button
              disabled
              className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-slate-900 text-white font-semibold text-sm opacity-60 cursor-not-allowed w-52 justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.18 23.76c.3.17.64.22.99.14l12.12-6.99-2.54-2.54-10.57 9.39zm-1.7-20.1c-.06.2-.09.42-.09.66v19.36c0 .24.03.46.09.66l.09.09 10.83-10.83v-.25L1.57 3.57l-.09.09zm20.44 8.74l-2.76-1.59-2.85 2.85 2.85 2.85 2.77-1.6c.79-.46.79-1.2-.01-1.51zM4.17.24L16.29 7.23l-2.54 2.54L3.18.38C3.48.21 3.87.22 4.17.24z"/>
              </svg>
              <span>
                <span className="block text-[10px] font-normal opacity-70">출시 예정</span>
                Google Play
              </span>
            </button>
          </div>

          {/* 사전 알림 */}
          <p className="mt-8 text-sm text-slate-400">
            출시 알림을 받고 싶다면{" "}
            <Link href="/signup" className="text-indigo-600 font-medium hover:underline">
              웹에서 먼저 시작하기 →
            </Link>
          </p>
        </div>
      </section>

      {/* 앱 목업 영역 */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* 텍스트 */}
          <div className="flex-1 text-left">
            <p className="text-indigo-600 text-sm font-semibold uppercase tracking-wide mb-3">Mobile First</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4 leading-snug">
              웹에서 만든 포트폴리오,<br />앱에서 더 편하게
            </h2>
            <p className="text-slate-500 leading-relaxed">
              이미 vibefolio.net에서 포트폴리오를 만들었다면 앱에서도 그대로 이어집니다.
              새 프로젝트 등록, 평가 확인해요, 메시지까지 — 손가락 하나로.
            </p>
          </div>

          {/* 목업 플레이스홀더 */}
          <div className="flex-shrink-0 flex gap-4">
            <div className="w-36 h-64 bg-gradient-to-b from-indigo-100 to-indigo-50 rounded-3xl border border-indigo-100 flex items-center justify-center shadow-lg">
              <Image src="/vibefolio2.png" alt="" width={48} height={48} className="opacity-30" />
            </div>
            <div className="w-36 h-64 bg-gradient-to-b from-slate-100 to-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center shadow-lg mt-8">
              <Image src="/vibefolio2.png" alt="" width={48} height={48} className="opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              앱에서 할 수 있는 것들
            </h2>
            <p className="text-slate-500">웹과 동일한 기능, 더 빠른 경험</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-indigo-600 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">지금 웹에서 먼저 시작하세요</h2>
          <p className="text-indigo-200 mb-8">
            앱 출시 전까지 vibefolio.net에서 모든 기능을 무료로 사용할 수 있어요.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-colors shadow-lg"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-100 text-center text-slate-400 text-sm">
        <p>© 2026 Vibefolio ·{" "}
          <a href="https://vibers.co.kr" className="hover:text-slate-600 transition-colors">계발자들 (Vibers)</a>
        </p>
      </footer>
    </main>
  );
}
