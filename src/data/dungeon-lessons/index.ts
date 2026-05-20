// 彙整所有副本的模組教學內文
import { aiWritingLessons } from "./ai-writing";
import { aiDesignLessons } from "./ai-design";
import { aiVideoLessons } from "./ai-video";
import { aiAutomationLessons } from "./ai-automation";
import { aiCodingLessons } from "./ai-coding";

type ModuleLesson = {
  content: string;
  practice: { task: string; hint: string };
};

// slug → { moduleIndex → lesson }
export const DUNGEON_LESSONS: Record<string, Record<number, ModuleLesson>> = {
  "ai-writing": aiWritingLessons,
  "ai-design": aiDesignLessons,
  "ai-video": aiVideoLessons,
  "ai-automation": aiAutomationLessons,
  "ai-coding": aiCodingLessons,
};

export function getDungeonLesson(slug: string, moduleIndex: number): ModuleLesson | undefined {
  return DUNGEON_LESSONS[slug]?.[moduleIndex];
}
