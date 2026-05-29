import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const pretendard = localFont({
  src: [
    {
      path: "../../public/resources/fonts/Pretendard-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/resources/fonts/Pretendard-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://sikdae-kosa.vercel.app"),
  title: "식권대장 - 송파 IT벤처타워 가락동 맛집 대시보드",
  description: "식권대장 84개 식당 목록 지도 매핑, 카카오 지도, 룰렛 추천 및 맛집 관리 대시보드",
  keywords: [
    "식권대장",
    "송파 IT벤처타워",
    "가락동 맛집",
    "식권대장 맛집",
    "맛집 대시보드",
    "카카오 지도",
    "점심 룰렛 추천",
    "가락시장역 맛집",
    "송파구 맛집 추천"
  ],
  authors: [{ name: "KOSA" }],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "식권대장 - 송파 IT벤처타워 가락동 맛집 대시보드",
    description: "식권대장 84개 식당 목록 지도 매핑, 카카오 지도, 룰렛 추천 및 맛집 관리 대시보드",
    url: "/",
    siteName: "식권대장 맛집 대시보드",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "식권대장 - 송파 IT벤처타워 가락동 맛집 대시보드",
    description: "식권대장 84개 식당 목록 지도 매핑, 카카오 지도, 룰렛 추천 및 맛집 관리 대시보드",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
