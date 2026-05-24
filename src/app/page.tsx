import type { Metadata } from "next";
import { getChapterMetas } from "@/lib/content";
import { getSiteStats } from "@/lib/stats";
import { getSeoForPath } from "@/lib/seo-render";
import { isIslandEnabled } from "@/lib/app-settings";
import { ChapterMap } from "@/components/home/ChapterMap";
import { Hero } from "@/components/home/Hero";
import { CareerPathSection } from "@/components/home/CareerPathSection";
import { MascotIntro } from "@/components/home/MascotIntro";
import { StageMap } from "@/components/home/StageMap";
import { MissionDungeons } from "@/components/home/MissionDungeons";
import { TrapBosses } from "@/components/home/TrapBosses";

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

  return (
    <div>
      <Hero
        totalChapters={stats.totalChapters}
        totalLessons={stats.totalLessons}
        stageCount={stats.stageCount}
        islandEnabled={islandEnabled}
      />
      <MascotIntro />
      <StageMap />
      <section className="max-w-7xl mx-auto px-6 py-16 border-b border-border">
        <h2 className="text-3xl font-bold mb-2 text-center">🗺️ 完整章節地圖</h2>
        <p className="text-center text-fg-muted mb-8">{stats.totalChapters} 章 × {stats.totalLessons}+ lesson — 點亮整片島嶼</p>
        <ChapterMap chapters={chapters} />
      </section>
      <MissionDungeons />
      <TrapBosses />
      <CareerPathSection />
    </div>
  );
}
