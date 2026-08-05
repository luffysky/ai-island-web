import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { compileThemeToCssVars, effectiveTheme, themeDefinitionSchema } from "@/lib/theme/engine";
import "./globals.css";

// 字體系統：Inter=內文、Outfit=標題(圓潤幾何顯示體)、JetBrains Mono=程式碼。
// 中文走系統字（PingFang TC / 微軟正黑）→ 免下載數 MB 的 CJK webfont、又清晰。
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["500", "600", "700", "800"], display: "swap" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono", display: "swap" });
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
import { ThemeFontLoader } from "@/components/theme/ThemeFontLoader";
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
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/logo-192.png",
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations();

  // Theme Studio SSR：從 cookie 讀「亮暗模式 + 目前套用的主題定義」，於首屏就把 CSS 變數
  // 以 inline style 寫在 <html>（inline 勝過 globals.css :root 與 data-palette →
  // 全自訂主題正確覆蓋快速色盤；與 client applyThemeToDom 的 inline 機制一致、無 FOUC）。
  // 任何一步失敗 → 不注入、回退 globals.css 預設（絕不因主題壞掉而整站爆版）。
  const cookieStore = await cookies();
  const mode: "light" | "dark" = cookieStore.get("ai_mode")?.value === "light" ? "light" : "dark";
  let themeStyle: React.CSSProperties | undefined;
  try {
    const raw = cookieStore.get("ai_theme")?.value;
    if (raw) {
      const def = themeDefinitionSchema.parse(JSON.parse(decodeURIComponent(raw)));
      themeStyle = compileThemeToCssVars(effectiveTheme(def, mode)) as React.CSSProperties;
    }
  } catch {
    themeStyle = undefined;
  }

  return (
    <html
      lang={locale === "en" ? "en" : locale === "ja" ? "ja" : locale === "ko" ? "ko" : "zh-Hant-TW"}
      data-mode={mode}
      style={themeStyle}
      className={`${inter.variable} ${outfit.variable} ${jbMono.variable}`}
    >
      <head>
        {/* 中文網頁字體：Noto Sans TC（Google 自動 unicode 分段、只下載用到的字）→ 全站中文變清爽 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet" />
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
        <NextIntlClientProvider locale={locale} messages={messages}>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              {/* a11y: skip-to-main 連結、tab 第一站、screen reader 用 */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-black focus:font-bold focus:text-sm"
              >
                {t("footer.skipToMain")}
              </a>
              <Marquee />
              <TopNav />
              <SideNav />
              <Breadcrumbs />
              <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
              <OnboardingWizard />
              <OnboardingTour />
              {/* 霧面玻璃 + 炫光 footer。pb 在手機多留 MobileBottomNav(h-14)+安全區、法律連結不被擋。 */}
              <footer className="relative mt-16">
                <div className="relative overflow-hidden border-t border-black/10 dark:border-white/10 bg-white/55 dark:bg-white/[0.035] backdrop-blur-xl backdrop-saturate-150">
                  {/* 炫光：頂部漸層細線 + 兩顆柔光暈 + 緩慢掃過的高光 */}
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                  <div aria-hidden className="pointer-events-none absolute -top-28 left-[18%] h-52 w-52 rounded-full bg-accent/25 blur-3xl" />
                  <div aria-hidden className="pointer-events-none absolute -bottom-28 right-[18%] h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />
                  <div aria-hidden className="footer-shine pointer-events-none absolute inset-0" />

                  <div className="relative max-w-6xl mx-auto px-6 pt-9 pb-[calc(2.25rem+3.5rem+env(safe-area-inset-bottom,0px))] md:pb-9">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                      <div className="flex items-center gap-2.5 text-sm text-fg-muted text-center md:text-left">
                        <span className="grid place-items-center w-9 h-9 rounded-2xl bg-gradient-to-br from-accent/25 to-sky-400/15 border border-white/20 text-lg shadow-sm shrink-0">🏝️</span>
                        <span className="leading-relaxed">{t("footer.madeBy")}</span>
                      </div>
                      <nav className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
                        <Link href="/privacy" className="px-3.5 py-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-black/[0.04] dark:hover:bg-white/10 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition">{t("footer.privacy")}</Link>
                        <Link href="/terms" className="px-3.5 py-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-black/[0.04] dark:hover:bg-white/10 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition">{t("footer.terms")}</Link>
                        <Link href="/cookies" className="px-3.5 py-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-black/[0.04] dark:hover:bg-white/10 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition">{t("footer.cookies")}</Link>
                      </nav>
                    </div>
                  </div>
                </div>
              </footer>
              <AITutorAutoContext />
              <CookieBanner />
              <InteractionTracker />
              <WebVitalsReporter />
              <ThemeFontLoader />
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
