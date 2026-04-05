"use client";

// react-hot-toast 제거됨 — sonner Toaster가 layout.tsx에서 전역 제공
// 이 컴포넌트는 ClientProviders 호환용으로 유지
export function ToastProvider() {
  return null;
}
