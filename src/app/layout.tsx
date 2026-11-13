import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "不说再见 · 我的生活门户", template: "%s · 不说再见" },
  description: "用文字、照片和影像，收藏生活里值得记住的片刻。",
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
