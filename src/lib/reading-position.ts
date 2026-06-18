// 記住「學習進度到達的最遠段落」— 讓使用者重開章節 / 回到網站能一鍵跳回讀到的最後 lesson。
// 純 localStorage（client-only）、不碰 DB。每章各記一筆「最遠到達」 + 記最近活躍的章。
//
// ⚠️ 語意：記的是「最遠到達」、不是「目前停留位置」。
//    回頭複習前面段落「不會」覆蓋進度（否則 reading-position 會倒退、跳轉失準）。
//    判斷遠近用 lessonIndex（該課在章內的 0-based 序位）。
const KEY = "reading_pos_v1";

export type ReadingPos = {
  chapterId: number;
  lessonId: string;
  lessonIndex: number; // 該課在章內的 0-based 序位（判斷「最遠到達」用）
  lessonNumber?: string | number;
  lessonTitle?: string;
  at: number; // epoch ms
};

type Store = { lastChapterId?: number; byChapter: Record<number, ReadingPos> };

function read(): Store {
  if (typeof window === "undefined") return { byChapter: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === "object") {
        // 舊版只有 last（無 lastChapterId）→ 沿用它的 chapterId 遷移
        const lastChapterId = s.lastChapterId ?? s.last?.chapterId;
        return { lastChapterId, byChapter: s.byChapter ?? {} };
      }
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
  const prev = s.byChapter[p.chapterId];
  // 舊資料沒有 lessonIndex → 當成 -1，確保第一次寫入就會前進。
  const prevIdx = prev?.lessonIndex ?? -1;
  // 「最遠到達」wins：只有讀到比已記錄更後面（或同一節、更新標題）才前進；
  // 回頭複習前面 lesson 不覆蓋。
  if (!prev || p.lessonIndex >= prevIdx) {
    s.byChapter[p.chapterId] = { ...p, at: Date.now() };
  }
  // 全站「最近活躍章」永遠更新 → 回到網站時 getReadingPos() 指到你最後待的那章的「最遠進度」。
  s.lastChapterId = p.chapterId;
  write(s);
}

/** 傳 chapterId → 該章的「最遠到達」；不傳 → 最近活躍章的「最遠到達」 */
export function getReadingPos(chapterId?: number): ReadingPos | null {
  const s = read();
  if (chapterId != null) return s.byChapter[chapterId] ?? null;
  if (s.lastChapterId != null) return s.byChapter[s.lastChapterId] ?? null;
  return null;
}

/** 顯示 lesson 編號：lesson.number 本身常已含「LESSON」前綴、別重複加（避免「LESSON LESSON 26.0」）。 */
export function formatLessonNumber(n?: string | number): string | null {
  if (n == null) return null;
  const s = String(n).trim();
  return /^lesson/i.test(s) ? s : `LESSON ${s}`;
}
