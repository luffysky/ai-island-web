import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
const ADMIN_SLUG = process.env.ADMIN_SLUG || "console-x7k2";

export default function robots(): MetadataRoute.Robots {
  // 公開內容、所有 user-agent 預設可爬
  // 包括：Googlebot / Bingbot / GPTBot / ClaudeBot / PerplexityBot / Google-Extended / 等
  // 私區（/admin /me /api 等）一律 disallow
  const disallow = [
    "/api/",
    "/admin",
    `/${ADMIN_SLUG}`,
    "/me/",
    "/auth/",
    "/debug",
    "/debug-auth",
    "/settings",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // 明示歡迎主要 AI bot 抓 — 給 GEO（Generative Engine Optimization）
      // 這些 bot 抓到後會用於回答使用者的 AI 對話、提升被引用機率
      { userAgent: "GPTBot", allow: "/", disallow },
      { userAgent: "ClaudeBot", allow: "/", disallow },
      { userAgent: "Claude-Web", allow: "/", disallow },
      { userAgent: "anthropic-ai", allow: "/", disallow },
      { userAgent: "PerplexityBot", allow: "/", disallow },
      { userAgent: "Google-Extended", allow: "/", disallow },
      { userAgent: "Bingbot", allow: "/", disallow },
      { userAgent: "facebookexternalhit", allow: "/", disallow }, // FB / IG OG preview
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
