import { MetadataRoute } from "next";
import { SITE_STATS } from "@/lib/site-stats";

/**
 * Dynamic PWA manifest — Next.js 14+ App Router 支援用 manifest.ts 動態生成
 *
 * 取代 public/manifest.webmanifest (那個是 hardcode "71 章")、改用 SITE_STATS 活數據。
 * 章節數變了之後 PWA 安裝畫面也會自動更新。
 */
export default function manifest(): MetadataRoute.Manifest {
  const ch = SITE_STATS.chapterCount;
  const ls = SITE_STATS.lessonCount;

  return {
    name: `AI 島 — ${ch} 章全端養成班`,
    short_name: "AI 島",
    description: `用遊戲化方式學程式：HTML 到 AI Agent ${ch} 章 ${ls}+ lesson、3D 學習島嶼 + AI 導師陪練。`,
    start_url: "/?utm_source=pwa",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    lang: "zh-Hant-TW",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "看章節",
        short_name: "章節",
        description: `${ch} 章課程地圖`,
        url: "/chapters",
        icons: [{ src: "/favicon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
      {
        name: "副本",
        short_name: "副本",
        description: "主題式短課",
        url: "/courses",
        icons: [{ src: "/favicon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
      {
        name: "排行榜",
        short_name: "排行",
        description: "每天 00:00 更新",
        url: "/leaderboard",
        icons: [{ src: "/favicon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
      {
        name: "我的學習",
        short_name: "我的",
        description: "進度 / 簽到 / 段位",
        url: "/me",
        icons: [{ src: "/favicon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
    ],
    prefer_related_applications: false,
  };
}
