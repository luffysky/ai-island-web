import { chapters } from "@/data/chapters";

export function getSiteStats() {
  const isAppendix = (stage: number | string) => stage === 7 || stage === "appendix";
  const mainChapters = chapters.filter((chapter) => !isAppendix(chapter.stage));
  const appendixChapters = chapters.filter((chapter) => isAppendix(chapter.stage));
  const totalLessons = chapters.reduce(
    (sum, chapter) => sum + (chapter.lessons?.length ?? 0),
    0
  );
  const stageCount = new Set(mainChapters.map((chapter) => chapter.stage)).size;

  return {
    totalChapters: chapters.length,
    mainChapterCount: mainChapters.length,
    appendixCount: appendixChapters.length,
    totalLessons,
    stageCount,
  };
}
