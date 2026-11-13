import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./journal.css";
export const metadata: Metadata = {
  title: { default: "不说再见 · 我的生活门户", template: "%s · 不说再见" },
  description: "好玩的、热爱的、随手拍的。用照片、视频和文字，记录你的日常。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main">
          跳到内容
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
