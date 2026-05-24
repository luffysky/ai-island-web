import { getChapterMetas } from "@/lib/content";
import { ChapterMap } from "@/components/home/ChapterMap";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "所有章節 — 71 章 1136+ lesson | AI 島",
  description: "HTML / CSS / JavaScript / TypeScript / React / Vue / Next.js / Node / AI Agent — 71 章完整全端養成路線、遊戲化學習、AI 導師陪你練。",
  alternates: { canonical: "/chapters" },
  openGraph: {
    title: "所有章節 — 71 章 1136+ lesson | AI 島",
    description: "前端到 AI Agent 完整路線、71 章 1136+ lesson、遊戲化學習。",
    type: "website",
  },
};

export default async function ChaptersPage() {
  const chapters = await getChapterMetas();
  const lessonCount = chapters.reduce((s, c) => s + c.lessonCount, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">📚 所有章節</h1>
        <p className="text-sm text-fg-muted">{chapters.length} 章 × 7 大區域、共 {lessonCount} 個 lesson</p>
      </div>
      <ChapterMap chapters={chapters} />
    </div>
  );
}
