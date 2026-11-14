import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./journal.css";
import "./cinema.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="zh-CN" className={display.variable}>
      <body>
        <a className="skip-link" href="#main">
          跳到内容
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
