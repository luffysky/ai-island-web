import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { AITutorAutoContext } from "@/components/AITutorAutoContext";
import { CookieBanner } from "@/components/CookieBanner";
import { SideNav } from "@/components/SideNav";
import { InteractionTracker } from "@/components/analytics/InteractionTracker";
import { AuthProvider } from "@/lib/auth-context";
import { AdminFloatingToolbar } from "@/components/admin/AdminFloatingToolbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { VisitTracker } from "@/components/layout/VisitTracker";
import { Marquee } from "@/components/Marquee";
import { Pet } from "@/components/pet/Pet";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { SITE_STATS } from "@/lib/site-stats";

const TITLE = `AI 島：${SITE_STATS.chapterCount} 章全端養成班`;
const DESCRIPTION = `用最簡單的方式學會最難的技術—HTML 到 AI Agent ${SITE_STATS.chapterCount} 章全端 + 遊戲化學習。`;
const OG_DESCRIPTION = `${SITE_STATS.chapterCount} 章 × ${SITE_STATS.lessonCount}+ 高品質 lesson、遊戲化學習、SnowRealm 生態整合`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.webmanifest",
  // 預設 canonical：自己（每個頁面可在自己 generateMetadata 覆寫）
  alternates: {
    canonical: "/",
    languages: {
      "zh-Hant": SITE_URL,
      "zh-Hant-TW": SITE_URL,
      "x-default": SITE_URL,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI 島",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: TITLE,
    description: OG_DESCRIPTION,
    images: ["/og.png"],
    locale: "zh_TW",
    type: "website",
    siteName: "AI 島",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: OG_DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Marquee />
              <TopNav />
              <SideNav />
              <main className="flex-1">{children}</main>
              <footer className="border-t border-border py-8 mt-16">
                <div className="max-w-6xl mx-auto px-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-fg-muted">
                    <div>© 2026 AI 島 · 由 SnowRealm 製作 · 招財 🐹 守護</div>
                    <nav className="flex gap-4">
                      <Link href="/privacy" className="hover:text-fg transition">隱私權政策</Link>
                      <Link href="/terms" className="hover:text-fg transition">使用條款</Link>
                      <Link href="/cookies" className="hover:text-fg transition">Cookie 政策</Link>
                    </nav>
                  </div>
                </div>
              </footer>
              <AITutorAutoContext />
              <CookieBanner />
              <InteractionTracker />
              <WebVitalsReporter />
              <AdminFloatingToolbar />
              <Pet />
              <MobileBottomNav />
              <CommandPalette />
              <VisitTracker />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
