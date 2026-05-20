import { getChapterMetas } from "@/lib/content";
import { ChapterMap } from "@/components/home/ChapterMap";
import { Hero } from "@/components/home/Hero";
import { CareerPathSection } from "@/components/home/CareerPathSection";
import { MascotIntro } from "@/components/home/MascotIntro";
import { StageMap } from "@/components/home/StageMap";
import { MissionDungeons } from "@/components/home/MissionDungeons";
import { TrapBosses } from "@/components/home/TrapBosses";

export default async function HomePage() {
  const chapters = await getChapterMetas();
  const lessonCount = chapters.reduce((sum, chapter) => sum + chapter.lessonCount, 0);

  return (
    <div>
      <Hero />
      <MascotIntro />
      <StageMap />
      <section className="max-w-7xl mx-auto px-6 py-16 border-b border-[var(--color-border)]">
        <h2 className="text-3xl font-bold mb-2 text-center">🗺️ 完整章節地圖</h2>
        <p className="text-center text-[var(--color-fg-muted)] mb-8">{chapters.length} 章 × {lessonCount}+ lesson — 點亮整片島嶼</p>
        <ChapterMap chapters={chapters} />
      </section>
      <MissionDungeons />
      <TrapBosses />
      <CareerPathSection />
    </div>
  );
}
