"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@/components/FaIcon";
import {
  faChartBar,
  faImage,
  faUsers,
  faBriefcase,
  faCommentDots,
  faFileAlt,
  faBullhorn,
  faQuestionCircle,
  faTachometerAlt,
  faBell,
  faCog,
  faArrowLeft,
  faChevronRight,
  faTv,
  faCheckDouble,
  faSearch
} from "@fortawesome/free-solid-svg-icons";

const menuItems = [
  {
    title: "대시보드",
    path: "/admin",
    icon: faTachometerAlt,
    color: "text-slate-600"
  },
  {
    title: "배너 관리",
    path: "/admin/banners",
    icon: faImage,
    color: "text-purple-500"
  },
  {
    title: "프로젝트 관리",
    path: "/admin/projects",
    icon: faFileAlt,
    color: "text-blue-500"
  },
  {
    title: "채용/공모전 관리",
    path: "/admin/recruit",
    icon: faBriefcase,
    color: "text-green-500"
  },
  {
    title: "크롤링 일괄 승인",
    path: "/admin/recruit-approval",
    icon: faCheckDouble,
    color: "text-emerald-500"
  },
  {
    title: "공지사항 관리",
    path: "/admin/notices",
    icon: faBullhorn,
    color: "text-amber-500"
  },
  {
    title: "FAQ 관리",
    path: "/admin/faqs",
    icon: faQuestionCircle,
    color: "text-cyan-500"
  },
  {
    title: "문의 내역",
    path: "/admin/inquiries",
    icon: faCommentDots,
    color: "text-orange-500"
  },
  {
    title: "사용자 관리",
    path: "/admin/users",
    icon: faUsers,
    color: "text-pink-500"
  },
  {
    title: "방문 통계",
    path: "/admin/stats",
    icon: faChartBar,
    color: "text-indigo-500"
  },
  {
    title: "SEO 관리",
    path: "/admin/seo",
    icon: faSearch,
    color: "text-teal-500"
  },
  {
    title: "설정 관리",
    path: "/admin/settings",
    icon: faCog,
    color: "text-slate-600"
  },

];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-r border-indigo-100/60 z-[110] flex flex-col shadow-[1px_0_20px_-8px_rgba(79,70,229,0.08)]">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100/60">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-700 transition-all duration-300 shadow-[0_2px_8px_rgba(79,70,229,0.35)]">
            <span className="text-white font-black text-xl italic">V</span>
          </div>
          <span className="font-black text-lg tracking-tighter">VIBEFOLIO</span>
          <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded ml-1">ADMIN</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)]"
                  : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={item.icon} className={`w-4 h-4 transition-colors ${isActive ? "text-white" : item.color + " group-hover:text-indigo-600"}`} />
                <span className="font-medium text-sm">{item.title}</span>
              </div>
              {isActive && <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100/60">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium text-sm"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          사이트로 돌아가기
        </Link>
      </div>
    </aside>
  );
}
