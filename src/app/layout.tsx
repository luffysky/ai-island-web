import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { AITutorAutoContext } from "@/components/AITutorAutoContext";
import { CookieBanner } from "@/components/CookieBanner";
import { SideNav } from "@/components/SideNav";
import { InteractionTracker } from "@/components/analytics/InteractionTracker";
import { SITE_STATS } from "@/lib/site-stats";

const TITLE = `AI 島：${SITE_STATS.chapterCount} 章全端養成班`;
const DESCRIPTION = `用最簡單的方式學會最難的技術—HTML 到 AI Agent ${SITE_STATS.chapterCount} 章全端 + 遊戲化學習。`;
const OG_DESCRIPTION = `${SITE_STATS.chapterCount} 章 × ${SITE_STATS.lessonCount}+ 高品質 lesson、遊戲化學習、SnowRealm 生態整合`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw"),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: TITLE,
    description: OG_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen flex flex-col">
        <TopNav />
        <SideNav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--color-border)] py-8 mt-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--color-fg-muted)]">
              <div>© 2026 AI 島 · 由 SnowRealm 製作 · 招財 🐹 守護</div>
              <nav className="flex gap-4">
                <Link href="/privacy" className="hover:text-[var(--color-fg)] transition">隱私權政策</Link>
                <Link href="/terms" className="hover:text-[var(--color-fg)] transition">使用條款</Link>
                <Link href="/cookies" className="hover:text-[var(--color-fg)] transition">Cookie 政策</Link>
              </nav>
            </div>
          </div>
        </footer>
        <AITutorAutoContext />
        <CookieBanner />
        <InteractionTracker />
      </body>
    </html>
  );
}
