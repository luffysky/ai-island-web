import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

// GEO（Generative Engine Optimization）：明示歡迎主流 AI 引用/搜尋爬蟲。
// 抓到後用於回答使用者的 AI 對話、提升被引用機率。
// ⚠️ 注意：線上若掛 Cloudflare，其「AI Audit / Managed robots.txt」可能會在最前面
//    注入 Disallow AI bots 的段落、蓋過本檔 → 要到 Cloudflare 後台關掉才會生效。
const AI_BOTS = [
  // OpenAI
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  // Anthropic
  "ClaudeBot", "Claude-Web", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  // Perplexity
  "PerplexityBot", "Perplexity-User",
  // Google（Gemini / AI Overviews 訓練與抓取）
  "Google-Extended",
  // Apple（Siri / Spotlight）
  "Applebot", "Applebot-Extended",
  // Meta AI
  "meta-externalagent", "FacebookBot",
  // 其他 AI 引擎 / 資料集
  "CCBot", "cohere-ai", "Amazonbot", "YouBot", "DuckAssistBot", "MistralAI-User", "Diffbot", "Timpibot",
];

// 分享/OG 預覽爬蟲：使用者貼連結時要抓「任何」被分享的頁面產生預覽卡 → 給寬鬆權限
const OG_PREVIEW_BOTS = [
  "facebookexternalhit", "Twitterbot", "Slackbot", "Slackbot-LinkExpanding",
  "Discordbot", "TelegramBot", "WhatsApp", "LinkedInBot", "Line", "Pinterest",
];

// AI 只開放這三區內容：教學(章節) / 副本 / 已發佈部落格。其餘不餵給 AI。
const AI_ALLOW_PATHS = ["/chapters", "/courses", "/blogs"];

export default function robots(): MetadataRoute.Robots {
  // 私區（/admin /me /api 等）一律 disallow
  const disallow = [
    "/api/",
    "/admin",
    // ⚠️ 刻意不列出後台密路徑。
    // robots.txt 是公開檔案，而攻擊者讀它的主要目的就是找隱藏路徑——
    // 把密路徑寫進 Disallow 等於主動公告它的存在。
    // 後台本來就在登入牆後面，爬蟲進不去，也不會有連結指向它。
    "/me/",
    "/auth/",
    "/debug",
    "/debug-auth",
    "/settings",
  ];

  return {
    rules: [
      // 一般 user-agent + 搜尋引擎：公開頁全可索引（私區除外）
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "Googlebot", allow: "/", disallow },
      { userAgent: "Bingbot", allow: "/", disallow },
      // 分享預覽爬蟲：任何公開頁都可抓（產生 OG 卡）
      ...OG_PREVIEW_BOTS.map((ua) => ({ userAgent: ua, allow: "/", disallow })),
      // AI 引用/訓練爬蟲：只開放 教學 / 副本 / 已發佈部落格，其餘 disallow
      ...AI_BOTS.map((ua) => ({ userAgent: ua, allow: AI_ALLOW_PATHS, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
