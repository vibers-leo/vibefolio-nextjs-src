import type { Metadata, Viewport } from 'next';
import TossLayout from '@/components/toss/TossLayout';

export const metadata: Metadata = {
  title: '바이브폴리오 | 토스',
  description: '포트폴리오 브라우저 — 토스에서 바로 시작하세요',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function TossRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TossLayout serviceName="바이브폴리오">{children}</TossLayout>;
}
