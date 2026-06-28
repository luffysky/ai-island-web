import type { Metadata } from "next";
import { getChapterMetas } from "@/lib/content";
import { getSiteStats } from "@/lib/stats";
import { getSeoForPath } from "@/lib/seo-render";
import { isIslandEnabled, isCreatorIslandEnabled } from "@/lib/app-settings";
import { ChapterMap } from "@/components/home/ChapterMap";
import { Hero } from "@/components/home/Hero";
import { CareerPathSection } from "@/components/home/CareerPathSection";
import { MascotIntro } from "@/components/home/MascotIntro";
import { StageMap } from "@/components/home/StageMap";
import { MissionDungeons } from "@/components/home/MissionDungeons";
import { TrapBosses } from "@/components/home/TrapBosses";

// 不靜態快照：島嶼開關 / 章節數要能即時反映後台改動（否則 toggle 了首頁不變）。
export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  // 後台 seo_pages 有 "/" override 就用 override（含 placeholder 渲染）；
  // 沒有就走 layout.tsx 的預設 metadata。
  const override = await getSeoForPath("/");
  return override ?? {};
}

export default async function HomePage() {
  const chapters = await getChapterMetas();
  const stats = getSiteStats();
  const islandEnabled = await isIslandEnabled();
  const creatorIslandEnabled = await isCreatorIslandEnabled();

  // 章/課數直接從資料庫算（getChapterMetas 已是 DB 即時資料），避免 build 快照過時。
  // 撈不到時 fallback 靜態 stats。
  const totalChapters = chapters.length || stats.totalChapters;
  const totalLessons =
    chapters.reduce((sum, ch) => sum + (ch.lessonCount ?? 0), 0) || stats.totalLessons;

  return (
    <div>
      <Hero
        totalChapters={totalChapters}
        totalLessons={totalLessons}
        stageCount={stats.stageCount}
        islandEnabled={islandEnabled}
        creatorIslandEnabled={creatorIslandEnabled}
      />
      <MascotIntro />
      <StageMap />
      <section className="max-w-7xl mx-auto px-6 py-16 border-b border-border">
        <h2 className="text-3xl font-bold mb-2 text-center">🗺️ 完整章節地圖</h2>
        <p className="text-center text-fg-muted mb-8">{totalChapters} 章 × {totalLessons}+ lesson — 點亮整片島嶼</p>
        <ChapterMap chapters={chapters} />
      </section>
      <MissionDungeons />
      <TrapBosses />
      <CareerPathSection />
    </div>
  );
}
