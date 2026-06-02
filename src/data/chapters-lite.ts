import data from "./chapters-lite.json";

/**
 * 輕量章節索引（只含 id / stage / lessonIds）——給 client component 用，
 * 不會把整包 8.7MB 章節內容（@/data/chapters）打進 client bundle。
 * 由 `node scripts/gen-chapters-lite.mjs` 產生，章節結構變動時重跑。
 */
export interface ChapterLite {
  id: number;
  stage: number;
  lessonIds: string[];
}

export const chaptersLite: ChapterLite[] = data as ChapterLite[];
