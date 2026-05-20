// 彙整所有副本的模組教學內文
// 之後其他副本的內文檔做好、在這裡 import 並加進 map

import { aiWritingLessons } from "./ai-writing";

type ModuleLesson = {
  content: string;
  practice: { task: string; hint: string };
};

// slug → { moduleIndex → lesson }
export const DUNGEON_LESSONS: Record<string, Record<number, ModuleLesson>> = {
  "ai-writing": aiWritingLessons,
  // "ai-design": aiDesignLessons,      // 待製作
  // "ai-video": aiVideoLessons,        // 待製作
  // "ai-automation": aiAutomationLessons, // 待製作
  // "ai-coding": aiCodingLessons,      // 待製作
};

export function getDungeonLesson(slug: string, moduleIndex: number): ModuleLesson | undefined {
  return DUNGEON_LESSONS[slug]?.[moduleIndex];
}
