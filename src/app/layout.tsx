import type { Metadata } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/sonner";
// TooltipProvider is already in ClientProviders.tsx
import { AutoLogoutProvider } from "@/components/AutoLogoutProvider";
import { RootLayoutContent } from "@/components/layout/RootLayoutContent";
import RealtimeListener from "@/components/RealtimeListener";
import { VisitTracker } from "@/components/VisitTracker";

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: "--font-poppins",
});

// Pretendard loaded via CDN in globals.css (premium Korean font, replaces Noto Sans KR)

export const metadata: Metadata = {
  metadataBase: new URL('https://vibefolio.net'),
  title: "Vibefolio - 크리에이터를 위한 영감 저장소",
  description: "디자이너, 개발자, 기획자를 위한 프로젝트 아카이빙 및 레퍼런스 공유 플랫폼",
  keywords: ["AI", "포트폴리오", "바이브코딩", "창작물", "디자인", "일러스트", "3D"],
  openGraph: {
    title: "Vibefolio - 크리에이터를 위한 영감 저장소",
    description: "디자이너, 개발자, 기획자를 위한 프로젝트 아카이빙 및 레퍼런스 공유 플랫폼",
    type: "website",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibefolio - 크리에이터를 위한 영감 저장소",
    description: "디자이너, 개발자, 기획자를 위한 프로젝트 아카이빙 및 레퍼런스 공유 플랫폼",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/vibefolio2.png",
    shortcut: "/vibefolio2.png",
    apple: "/vibefolio2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/* Supabase Storage Preconnect for faster image loading */}
        <link rel="preconnect" href="https://cakhdvthnufjaxdbgqzg.supabase.co" />
        <link rel="dns-prefetch" href="https://cakhdvthnufjaxdbgqzg.supabase.co" />
        {/* Naver Search Advisor */}
        <meta name="naver-site-verification" content="7c7825f1ae23dae926574e405e86fbe1f8479e13" />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased bg-white min-h-[100dvh] custom-scrollbar overscroll-none`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Vibefolio",
              "url": "https://vibefolio.net",
              "description": "크리에이터를 위한 영감 저장소. 디자이너, 개발자, 기획자를 위한 프로젝트 아카이빙 및 레퍼런스 공유 플랫폼",
              "applicationCategory": "DesignApplication",
              "operatingSystem": "Web",
              "creator": {
                "@type": "Organization",
                "name": "계발자들 (Vibers)",
                "url": "https://vibers.co.kr"
              },
              "inLanguage": "ko"
            })
          }}
        />
        {/* Google AdSense Auto Ads */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7704550771011130"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          strategy="lazyOnload"
        />
        {/* Google Analytics (GA4) */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
        <VisitTracker />
        <ClientProviders>
          <AutoLogoutProvider>
            <>
              <RealtimeListener />
              <RootLayoutContent isReviewServer={false}>
                {children}
              </RootLayoutContent>
              <Toaster position="top-center" />
              <ScrollToTop />
            </>
          </AutoLogoutProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
