import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { VisitTracker } from "@/components/layout/VisitTracker";
import { Marquee } from "@/components/Marquee";
import { Pet } from "@/components/pet/Pet";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { PWAInstall } from "@/components/PWAInstall";
import { OfflineBanner } from "@/components/OfflineBanner";
import { LineBindBanner } from "@/components/LineBindBanner";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { SITE_STATS } from "@/lib/site-stats";
import { organizationSchema, websiteSchema, jsonLdScript } from "@/lib/seo-jsonld";

const TITLE = `AI 島：${SITE_STATS.chapterCount} 章全端養成班`;
const DESCRIPTION = `用最簡單的方式學會最難的技術—HTML 到 AI Agent ${SITE_STATS.chapterCount} 章全端 + 遊戲化學習。`;
const OG_DESCRIPTION = `${SITE_STATS.chapterCount} 章 × ${SITE_STATS.lessonCount}+ 高品質 lesson、遊戲化學習、SnowRealm 生態整合`;
// 用 || 而非 ??：空字串（build 時 env 沒帶到）也要 fallback、否則 new URL("") 會炸掉 build
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";

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
  // 鎖縮放：layout viewport = 視覺 viewport = device-width，
  // 讓 100vw 精準等於螢幕寬，浮動元件（綠寶聊天、筆記）才不會在手機溢出。PWA 也更像原生 App。
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="zh-Hant-TW">
      <head>
        {/* JSON-LD 全站結構化資料：Organization + WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript([organizationSchema(), websiteSchema()])}
        />
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              {/* a11y: skip-to-main 連結、tab 第一站、screen reader 用 */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-black focus:font-bold focus:text-sm"
              >
                跳到主內容
              </a>
              <Marquee />
              <TopNav />
              <SideNav />
              <Breadcrumbs />
              <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
              <OnboardingWizard />
              <OnboardingTour />
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
              <PWAInstall />
              <OfflineBanner />
              <LineBindBanner />
              <AdminFloatingToolbar />
              <Pet />
              <MobileBottomNav />
              <CommandPalette />
              <VisitTracker />
              <PWAInstallPrompt />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
