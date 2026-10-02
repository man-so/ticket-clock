import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticket Clock",
  description:
    "티켓 예매 사이트의 예상 서버 시간을 기준으로 티켓 오픈까지 남은 시간을 확인하세요.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
