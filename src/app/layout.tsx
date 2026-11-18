import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Providers } from "@/components/providers";
import { themeInitScript } from "@/lib/themes";
import "./globals.css";
import "./journal.css";
import "./comfort.css";
import "./studio.css";
import "./themes.css";
import "./home.css";
import "./home-enhancements.css";
import "./memory-experiences.css";
import './refinements.css';
import './memory-album.css';
import './collection-keepsake.css';
import './album-keepsake.css';
import './hero-keepsake.css';
import './gallery-polish.css';
import './theme-atmospheres.css';
import './media-refinement.css';
import './journal-atmosphere.css';
import './immersive-motion.css';
import './postcard-studio.css';
import './intrinsic-photos.css';
import './memory-sprite.css';
import './journal-editorial.css';
import './editorial-gallery.css';
import './auth-editorial.css';
import './world-motion.css';
import './uniform-memory-cards.css';
import './admin-studio.css';
import './theme-refinement.css';
import './anime-portal.css';
import './journal-living-cover.css';
import './journal-cover-layout.css';
import './admin-user-actions.css';
import './cinematic-motion.css';
import './projection-studio.css';

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "不说再见",
  applicationName: "不说再见",
  description: "在照片、影像与文字里，留住想记得的日常。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={display.variable} data-theme="dusk" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body>
        <a className="skip-link" href="#main">
          跳到内容
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
