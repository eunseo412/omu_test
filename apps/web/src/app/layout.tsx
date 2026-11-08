import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "O:MU 오늘의 mood", template: "%s · O:MU" },
  description: "추구미를 가진 사람의 옷장에서 옷을 빌려 입어보세요",
  appleWebApp: { capable: true, title: "O:MU", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // 아이폰 노치/홈 인디케이터 영역까지 사용
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="bg-neutral-100 text-neutral-900 antialiased">
        {/* 데스크톱에서도 모바일 폭으로 보여서 앱과 같은 경험 유지 */}
        <div className="mx-auto min-h-dvh max-w-[480px] bg-white shadow-sm">{children}</div>
      </body>
    </html>
  );
}
