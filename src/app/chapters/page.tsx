import { getChapterMetas } from "@/lib/content";
import { ChapterMap } from "@/components/home/ChapterMap";
import { SITE_STATS } from "@/lib/site-stats";
import { itemListSchema, breadcrumbSchema, jsonLdScript } from "@/lib/seo-jsonld";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

// 章節地圖 force-dynamic：確保 ChapterMap 顯示的 lessonCount 永遠跟 DB 一致
// （之前 revalidate=60 + ISR、production 某些章節 lesson 數一直顯示 0 / 舊值、林董抱怨）
// in-memory cache 還是 60s 一次、所以 DB 不會被打爆。
export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const chCount = SITE_STATS.chapterCount;
  const lsCount = SITE_STATS.lessonCount;
  const title = `所有章節 — ${chCount} 章 ${lsCount}+ lesson | AI 島`;
  return {
    title,
    description: `HTML / CSS / JavaScript / TypeScript / React / Vue / Next.js / Node / AI Agent — ${chCount} 章完整全端養成路線、遊戲化學習、AI 導師陪你練。`,
    alternates: { canonical: "/chapters" },
    openGraph: {
      title,
      description: `前端到 AI Agent 完整路線、${chCount} 章 ${lsCount}+ lesson、遊戲化學習。`,
      type: "website",
    },
  };
}

export default async function ChaptersPage() {
  const chapters = await getChapterMetas();
  const lessonCount = chapters.reduce((s, c) => s + c.lessonCount, 0);

  // JSON-LD: ItemList (整章列表) + Breadcrumb
  const ld = [
    itemListSchema(
      chapters.map((c) => ({
        name: `Ch${String(c.id).padStart(2, "0")} ${c.title}`,
        url: `${SITE_URL}/chapters/${c.id}`,
      }))
    ),
    breadcrumbSchema([
      { name: "首頁", url: SITE_URL },
      { name: "所有章節", url: `${SITE_URL}/chapters` },
    ]),
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(ld)} />
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">📚 所有章節</h1>
        <p className="text-sm text-fg-muted">{chapters.length} 章 × 7 大區域、共 {lessonCount} 個 lesson</p>
      </div>

      {/* C 方案：新手「從這開始」CTA 卡 — 第一次來不知道從哪開始 */}
      <Link
        href="/chapters/0"
        className="block mb-6 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-accent-2/10 to-transparent p-5 hover:border-accent transition group"
      >
        <div className="flex items-start gap-4">
          <div className="text-4xl">🌱</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-fg-muted inline-flex items-center gap-1 mb-1">
              <Sparkles size={10} className="text-accent" />
              新手友善
            </div>
            <h2 className="text-lg font-bold mb-1">不知道從哪開始？先看 Ch00「環境準備」</h2>
            <p className="text-xs text-fg-muted leading-relaxed">
              連終端機是什麼都不知道、怎麼裝 Python？這章給你最基本的「會用終端機 + 會推 GitHub」、所有後面課的基礎。
            </p>
            <div className="text-xs text-accent mt-2 inline-flex items-center gap-1 font-bold group-hover:gap-2 transition-all">
              開始第一課 <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </Link>

      <ChapterMap chapters={chapters} />
    </div>
  );
}
