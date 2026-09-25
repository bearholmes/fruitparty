import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "과실 잔치",
  description: "과일을 합치고 베스트 20에 도전하는 게임",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
