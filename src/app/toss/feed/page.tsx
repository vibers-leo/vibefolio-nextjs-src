import Link from 'next/link';

export default function TossFeedPage() {
  return (
    <div className="flex flex-1 flex-col px-5 py-6">
      <h2 className="mb-1 text-[20px] font-bold text-gray-900">프로젝트 피드</h2>
      <p className="mb-6 text-[14px] text-gray-500">
        크리에이터들의 최신 프로젝트
      </p>

      {/* 빈 상태 */}
      <div className="flex flex-1 flex-col items-center justify-center py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
          📂
        </div>
        <p className="mb-1 text-[16px] font-semibold text-gray-900">
          준비 중이에요
        </p>
        <p className="mb-6 text-center text-[14px] leading-relaxed text-gray-500">
          곧 다양한 프로젝트를<br />
          만나보실 수 있어요
        </p>
        <Link
          href="/toss"
          className="rounded-xl bg-indigo-500 px-6 py-3 text-[14px] font-semibold text-white transition-colors active:bg-indigo-600"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
