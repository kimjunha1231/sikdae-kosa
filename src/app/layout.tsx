import type { Metadata } from "next";
import localFont from "next/font/local";
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
  title: "식권대장 - 송파 IT벤처타워 가락동 맛집 대시보드",
  description: "식권대장 84개 식당 목록 지도 매핑, 카카오 지도, 룰렛 추천 및 맛집 관리 대시보드",
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
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
