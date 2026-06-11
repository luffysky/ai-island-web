// 記住「上次看到的段落」— 讓使用者重開章節 / 回到網站能一鍵跳回原本讀到的 lesson。
// 純 localStorage（client-only）、不碰 DB。每章各記一筆 + 全站最後一筆。
const KEY = "reading_pos_v1";

export type ReadingPos = {
  chapterId: number;
  lessonId: string;
  lessonNumber?: string | number;
  lessonTitle?: string;
  at: number; // epoch ms
};

type Store = { last?: ReadingPos; byChapter: Record<number, ReadingPos> };

function read(): Store {
  if (typeof window === "undefined") return { byChapter: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === "object") return { last: s.last, byChapter: s.byChapter ?? {} };
    }
  } catch {}
  return { byChapter: {} };
}

function write(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function saveReadingPos(p: Omit<ReadingPos, "at">) {
  if (!p.lessonId) return;
  const s = read();
  const entry: ReadingPos = { ...p, at: Date.now() };
  s.last = entry;
  s.byChapter[p.chapterId] = entry;
  write(s);
}

/** 傳 chapterId → 該章上次位置；不傳 → 全站最後一次看的位置 */
export function getReadingPos(chapterId?: number): ReadingPos | null {
  const s = read();
  if (chapterId != null) return s.byChapter[chapterId] ?? null;
  return s.last ?? null;
}
