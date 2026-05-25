/**
 * SEO JSON-LD structured data helpers
 *
 * Google 看 JSON-LD 才知道頁面是 Course / Article / Organization、
 * 才會給 rich snippet（搜尋結果中顯示課程資訊 / 麵包屑 / 評分 etc）。
 *
 * 用法：在 server component 內 inline <script type="application/ld+json">
 * Next.js 14+ App Router 支援這樣做、Google 抓得到。
 */

import { SITE_STATS } from "./site-stats";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw";
const SITE_NAME = "AI 島";
const SITE_DESC = `用遊戲化方式學程式：HTML 到 AI Agent ${SITE_STATS.chapterCount} 章 ${SITE_STATS.lessonCount}+ lesson、3D 島嶼 + AI 導師陪你練。`;

/** 全站通用：組織資訊（給 Google 知道是誰營運） */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/og.png`,
    description: SITE_DESC,
    foundingDate: "2025",
    areaServed: { "@type": "Country", name: "Taiwan" },
    knowsLanguage: ["zh-Hant-TW", "zh-Hant", "zh"],
  };
}

/** 全站通用：WebSite + 站內搜尋 SearchAction (Google 可直接顯示搜尋框) */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    inLanguage: "zh-Hant-TW",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/chapters?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Course schema：給章節頁、副本頁用 */
export function courseSchema(opts: {
  name: string;
  description: string;
  url: string;
  lessons?: number;
  difficulty?: string;
  updatedAt?: string | Date;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: "zh-Hant-TW",
    isAccessibleForFree: true,
    learningResourceType: "online course",
    ...(opts.lessons ? { numberOfLessons: opts.lessons } : {}),
    ...(opts.difficulty ? { educationalLevel: opts.difficulty } : {}),
    ...(opts.updatedAt ? { dateModified: new Date(opts.updatedAt).toISOString() } : {}),
    // Google 要求 Course 也提供 offers / instructor / hasCourseInstance
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "TWD",
      availability: "https://schema.org/InStock",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      inLanguage: "zh-Hant-TW",
    },
  };
}

/** Article schema：給部落格文章用 */
export function articleSchema(opts: {
  headline: string;
  description: string;
  url: string;
  imageUrl?: string;
  authorName: string;
  authorUrl?: string;
  publishedAt: string | Date;
  updatedAt?: string | Date;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    inLanguage: "zh-Hant-TW",
    author: {
      "@type": "Person",
      name: opts.authorName,
      ...(opts.authorUrl ? { url: opts.authorUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/og.png` },
    },
    datePublished: new Date(opts.publishedAt).toISOString(),
    dateModified: new Date(opts.updatedAt ?? opts.publishedAt).toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
  };
}

/** BreadcrumbList：給有麵包屑導航的頁面（章節 / 副本 / 部落格文章） */
export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** 把 schema 物件渲染成 <script type="application/ld+json"> 注入頁面 */
export function jsonLdScript(data: object | object[]) {
  const arr = Array.isArray(data) ? data : [data];
  return {
    __html: arr.map((d) => JSON.stringify(d)).join("\n"),
  };
}
