import { chapters } from "@/data/chapters";

/**
 * 站台統計、build-time 從 chapters JSON 算出來。
 * 新增 / 移除章節後重 build 就會自動更新。
 *
 * 用途：
 *   1. layout.tsx 預設 metadata 不再寫死 "60 章"
 *   2. SEO 字串內可用 {{chapter_count}} / {{lesson_count}} / {{published_count}}
 *      由 renderSeoTemplate() 帶入
 *   3. 其他頁面複用同一份來源
 */
export const SITE_STATS = {
  chapterCount: chapters.length,
  publishedCount: chapters.filter((c) => c.status === "published").length,
  lessonCount: chapters.reduce(
    (sum, c) => sum + (c.lessons?.length ?? 0),
    0,
  ),
};

/**
 * 把字串內 {{chapter_count}} 之類 placeholder 替換成現值。
 * 後台 SEO 管理可在 title / description / og 等欄位用這些 token。
 */
export function renderSeoTemplate(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/\{\{chapter_count\}\}/g, String(SITE_STATS.chapterCount))
    .replace(/\{\{published_count\}\}/g, String(SITE_STATS.publishedCount))
    .replace(/\{\{lesson_count\}\}/g, String(SITE_STATS.lessonCount));
}

/**
 * 給 admin UI 顯示「目前可用的 placeholder」用。
 */
export const SEO_PLACEHOLDERS: Array<{
  token: string;
  value: number;
  desc: string;
}> = [
  {
    token: "{{chapter_count}}",
    value: SITE_STATS.chapterCount,
    desc: "全部章節數（含未發布）",
  },
  {
    token: "{{published_count}}",
    value: SITE_STATS.publishedCount,
    desc: "已發布章節數",
  },
  {
    token: "{{lesson_count}}",
    value: SITE_STATS.lessonCount,
    desc: "全部 lesson 數",
  },
];
