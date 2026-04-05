"use client";

import { useState, useMemo } from "react";
import dayjs from "dayjs";
import { FontAwesomeIcon } from "@/components/FaIcon";
import {
  faChevronLeft,
  faChevronRight,
  faBookmark,
} from "@fortawesome/free-solid-svg-icons";

interface CalendarItem {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD (마감일)
  company?: string;
  type: string;
}

interface ContestCalendarProps {
  items: CalendarItem[];
  bookmarkedIds: Set<number>;
  onItemClick: (id: number) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function ContestCalendar({ items, bookmarkedIds, onItemClick }: ContestCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 해당 월의 날짜별 항목 매핑
  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    items.forEach((item) => {
      if (!item.date) return;
      const key = item.date.slice(0, 10); // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [items]);

  // 달력 그리드 생성
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf("month");
    const endOfMonth = currentMonth.endOf("month");
    const startDay = startOfMonth.day(); // 0=일요일
    const daysInMonth = endOfMonth.date();

    const days: (number | null)[] = [];
    // 이전 달 빈칸
    for (let i = 0; i < startDay; i++) days.push(null);
    // 이번 달
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [currentMonth]);

  const today = dayjs().format("YYYY-MM-DD");

  const selectedItems = selectedDate ? (itemsByDate[selectedDate] || []) : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더: 월 이동 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <button
          onClick={() => setCurrentMonth((m) => m.subtract(1, "month"))}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3 text-gray-500" />
        </button>
        <h3 className="text-lg font-bold text-gray-900">
          {currentMonth.format("YYYY년 M월")}
        </h3>
        <button
          onClick={() => setCurrentMonth((m) => m.add(1, "month"))}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-50">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-bold py-2 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-20 border-b border-r border-gray-50" />;
          }

          const dateStr = currentMonth.date(day).format("YYYY-MM-DD");
          const dayItems = itemsByDate[dateStr] || [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasBookmarked = dayItems.some((it) => bookmarkedIds.has(it.id));
          const dayOfWeek = (currentMonth.startOf("month").day() + day - 1) % 7;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`h-20 border-b border-r border-gray-50 p-1.5 text-left transition-colors relative ${
                isSelected
                  ? "bg-green-50"
                  : dayItems.length > 0
                  ? "hover:bg-gray-50 cursor-pointer"
                  : ""
              }`}
            >
              <span
                className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday
                    ? "bg-green-600 text-white"
                    : dayOfWeek === 0
                    ? "text-red-400"
                    : dayOfWeek === 6
                    ? "text-blue-400"
                    : "text-gray-700"
                }`}
              >
                {day}
              </span>

              {/* 마감 항목 dots */}
              {dayItems.length > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                  {dayItems.slice(0, 3).map((it) => (
                    <span
                      key={it.id}
                      className={`w-1.5 h-1.5 rounded-full ${
                        bookmarkedIds.has(it.id) ? "bg-yellow-400" : "bg-purple-400"
                      }`}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <span className="text-[9px] text-gray-400 font-bold">
                      +{dayItems.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* 찜 표시 */}
              {hasBookmarked && (
                <FontAwesomeIcon
                  icon={faBookmark}
                  className="absolute top-1 right-1 w-2.5 h-2.5 text-yellow-400"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 항목 리스트 */}
      {selectedDate && (
        <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-500 mb-2">
            {dayjs(selectedDate).format("M월 D일")} 마감
            {selectedItems.length === 0 && " — 항목 없음"}
          </p>
          {selectedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className="w-full text-left px-3 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all flex items-center gap-3"
            >
              {bookmarkedIds.has(item.id) && (
                <FontAwesomeIcon icon={faBookmark} className="w-3 h-3 text-yellow-400 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                {item.company && (
                  <p className="text-[10px] text-green-600 font-bold">{item.company}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 범례 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-400" /> 마감 예정
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400" /> 찜한 항목
        </div>
      </div>
    </div>
  );
}
