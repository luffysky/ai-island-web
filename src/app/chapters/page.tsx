import { getChapterMetas } from "@/lib/content";
import { ChapterMap } from "@/components/home/ChapterMap";

export default async function ChaptersPage() {
  const chapters = await getChapterMetas();
  const lessonCount = chapters.reduce((s, c) => s + c.lessonCount, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">📚 所有章節</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">{chapters.length} 章 × 7 大區域、共 {lessonCount} 個 lesson</p>
      </div>
      <ChapterMap chapters={chapters} />
    </div>
  );
}
