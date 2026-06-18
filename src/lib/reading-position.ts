// 學習進度（前台狀態）。純 client：localStorage 為離線快取、登入後跟 /api/me/learning-state 雙向合併。
//
// 記三件事：
//  1) 每章「目前停留位置 current」+「最遠到達 furthest」（回頭複習 furthest 不倒退）
//  2) 每課 engagement：捲動深度% / 停留時間 / miniQuiz 答對 / playground 跑過 → 推「掌握度」
//  3) lastChapterId：最近活躍章（全站「繼續學習」指向它）
const KEY = "reading_pos_v1";

export type Pos = {
  lessonId: string;
  lessonIndex: number; // 章內 0-based 序位（判斷遠近）
  lessonNumber?: string | number;
  lessonTitle?: string;
  at: number; // epoch ms
};
export type ChapterReading = { current: Pos; furthest: Pos };
export type Engagement = {
  chapterId: number;
  scrollDepth: number;   // 0..1 讀過的最大比例
  dwellMs: number;       // 累計停留毫秒
  quizPassed: boolean;
  playgroundRun: boolean;
  at: number;
};

type Store = {
  lastChapterId?: number;
  reading: Record<number, ChapterReading>;
  engagement: Record<string, Engagement>;
};

function emptyStore(): Store { return { reading: {}, engagement: {} }; }

function read(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return emptyStore();
    // 遷移舊格式：{ last?, byChapter: Record<id, Pos | {current,furthest}> }
    const lastChapterId = s.lastChapterId ?? s.last?.chapterId;
    const rawReading = s.reading ?? s.byChapter ?? {};
    const reading: Record<number, ChapterReading> = {};
    for (const [k, v] of Object.entries<any>(rawReading)) {
      if (!v) continue;
      if (v.current && v.furthest) reading[+k] = v;
      else if (v.lessonId) reading[+k] = { current: v, furthest: v }; // 舊：單一 Pos
    }
    return { lastChapterId, reading, engagement: s.engagement ?? {} };
  } catch { return emptyStore(); }
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

// ============ reading position ============
export function saveReadingPos(p: Omit<Pos, "at"> & { chapterId: number }) {
  if (!p.lessonId) return;
  const s = read();
  const pos: Pos = { lessonId: p.lessonId, lessonIndex: p.lessonIndex, lessonNumber: p.lessonNumber, lessonTitle: p.lessonTitle, at: Date.now() };
  const prev = s.reading[p.chapterId];
  const prevFurthestIdx = prev?.furthest.lessonIndex ?? -1;
  s.reading[p.chapterId] = {
    current: pos, // current 永遠更新成目前位置
    furthest: !prev || pos.lessonIndex >= prevFurthestIdx ? pos : prev.furthest, // 最遠 wins、回頭複習不倒退
  };
  s.lastChapterId = p.chapterId;
  write(s);
  markReadingDirty(p.chapterId);
}

/** 傳 chapterId → 該章；不傳 → 最近活躍章 */
export function getReading(chapterId?: number): ChapterReading | null {
  const s = read();
  const id = chapterId ?? s.lastChapterId;
  if (id == null) return null;
  return s.reading[id] ?? null;
}

export function getLastChapterId(): number | null {
  return read().lastChapterId ?? null;
}

// ============ engagement ============
export function recordEngagement(
  chapterId: number,
  lessonId: string,
  patch: { scrollDepth?: number; addDwellMs?: number; quizPassed?: boolean; playgroundRun?: boolean },
) {
  if (!lessonId) return;
  const s = read();
  const prev = s.engagement[lessonId];
  s.engagement[lessonId] = {
    chapterId,
    scrollDepth: Math.max(prev?.scrollDepth ?? 0, patch.scrollDepth ?? 0),
    dwellMs: (prev?.dwellMs ?? 0) + (patch.addDwellMs ?? 0),
    quizPassed: (prev?.quizPassed ?? false) || !!patch.quizPassed,
    playgroundRun: (prev?.playgroundRun ?? false) || !!patch.playgroundRun,
    at: Date.now(),
  };
  write(s);
  markEngagementDirty(lessonId);
}

export function getEngagement(lessonId: string): Engagement | null {
  return read().engagement[lessonId] ?? null;
}

/** 一節的掌握程度：完成/答對/跑過 → 掌握；讀滿 → 讀完；讀一些 → 掃過 */
export function lessonMastery(lessonId: string, completed: boolean): "mastered" | "read" | "skim" | null {
  const e = getEngagement(lessonId);
  if (completed || e?.quizPassed || e?.playgroundRun) return "mastered";
  if (e) {
    if (e.scrollDepth >= 0.9) return "read";
    if (e.scrollDepth > 0.15) return "skim";
  }
  return null;
}

// ============ 顯示 helper ============
/** lesson.number 本身常已含「LESSON」前綴、別重複加（避免「LESSON LESSON 26.0」）。 */
export function formatLessonNumber(n?: string | number): string | null {
  if (n == null) return null;
  const s = String(n).trim();
  return /^lesson/i.test(s) ? s : `LESSON ${s}`;
}

// ============ DB 同步（跨裝置） ============
let syncEnabled = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
const dirtyChapters = new Set<number>();
const dirtyLessons = new Set<string>();
let beaconBound = false;

function markReadingDirty(ch: number) { dirtyChapters.add(ch); scheduleFlush(); }
function markEngagementDirty(lid: string) { dirtyLessons.add(lid); scheduleFlush(); }

function scheduleFlush() {
  if (!syncEnabled || typeof window === "undefined") return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { void flushSync(); }, 3000);
}

function buildPayload() {
  const s = read();
  const reading = [...dirtyChapters].map((ch) => {
    const r = s.reading[ch];
    if (!r) return null;
    return {
      chapterId: ch,
      currentLessonId: r.current.lessonId, currentIndex: r.current.lessonIndex,
      currentNumber: r.current.lessonNumber ?? null, currentTitle: r.current.lessonTitle ?? null,
      furthestLessonId: r.furthest.lessonId, furthestIndex: r.furthest.lessonIndex,
      furthestNumber: r.furthest.lessonNumber ?? null, furthestTitle: r.furthest.lessonTitle ?? null,
    };
  }).filter(Boolean);
  const engagement = [...dirtyLessons].map((lid) => {
    const e = s.engagement[lid];
    if (!e) return null;
    return { lessonId: lid, chapterId: e.chapterId, scrollDepth: e.scrollDepth, dwellMs: e.dwellMs, quizPassed: e.quizPassed, playgroundRun: e.playgroundRun };
  }).filter(Boolean);
  return { reading, engagement };
}

async function flushSync() {
  if (!syncEnabled || typeof window === "undefined") return;
  if (dirtyChapters.size === 0 && dirtyLessons.size === 0) return;
  const payload = buildPayload();
  dirtyChapters.clear();
  dirtyLessons.clear();
  try {
    await fetch("/api/me/learning-state", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch { /* 離線：下次 save 會再標 dirty */ }
}

// 切走 / 關頁前用 sendBeacon 趕快送出未 flush 的進度（避免關太快丟資料）
function flushBeacon() {
  if (!syncEnabled || typeof navigator === "undefined" || !navigator.sendBeacon) return;
  if (dirtyChapters.size === 0 && dirtyLessons.size === 0) return;
  const payload = buildPayload();
  dirtyChapters.clear();
  dirtyLessons.clear();
  try {
    navigator.sendBeacon("/api/me/learning-state", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  } catch {}
}

export function setSyncEnabled(b: boolean) {
  syncEnabled = b;
  if (b && typeof window !== "undefined" && !beaconBound) {
    beaconBound = true;
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushBeacon(); });
    window.addEventListener("pagehide", flushBeacon);
  }
  if (b) scheduleFlush();
}

/** 登入後呼叫：從 DB 拉進度合併進 localStorage（furthest 取最遠、current 取最新、engagement 取 max/OR）。 */
export async function hydrateFromServer(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/me/learning-state", { credentials: "include" });
    if (!res.ok) { syncEnabled = false; return; } // 401 = 未登入
    const data = await res.json();
    const s = read();
    for (const r of data.reading ?? []) {
      const ch = r.chapter_id;
      const at = Date.parse(r.updated_at) || 0;
      const sFar: Pos = { lessonId: r.furthest_lesson_id, lessonIndex: r.furthest_lesson_index ?? -1, lessonNumber: r.furthest_lesson_number ?? undefined, lessonTitle: r.furthest_lesson_title ?? undefined, at };
      const sCur: Pos = { lessonId: r.current_lesson_id, lessonIndex: r.current_lesson_index ?? -1, lessonNumber: r.current_lesson_number ?? undefined, lessonTitle: r.current_lesson_title ?? undefined, at };
      const local = s.reading[ch];
      const furthest = !local || sFar.lessonIndex > local.furthest.lessonIndex ? sFar : local.furthest;
      const current = !local || sCur.at > local.current.at ? sCur : local.current;
      const f = furthest.lessonId ? furthest : current;
      const c = current.lessonId ? current : furthest;
      if (f.lessonId || c.lessonId) s.reading[ch] = { current: c, furthest: f };
    }
    for (const e of data.engagement ?? []) {
      const lid = e.lesson_id;
      const local = s.engagement[lid];
      s.engagement[lid] = {
        chapterId: e.chapter_id,
        scrollDepth: Math.max(e.scroll_depth ?? 0, local?.scrollDepth ?? 0),
        dwellMs: Math.max(Number(e.dwell_ms ?? 0), local?.dwellMs ?? 0),
        quizPassed: !!e.quiz_passed || !!local?.quizPassed,
        playgroundRun: !!e.playground_run || !!local?.playgroundRun,
        at: Date.now(),
      };
    }
    if (s.lastChapterId == null && (data.reading?.length ?? 0) > 0) {
      const newest = [...data.reading].sort((a: any, b: any) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0))[0];
      if (newest) s.lastChapterId = newest.chapter_id;
    }
    write(s);
    syncEnabled = true;
    setSyncEnabled(true);
  } catch { /* 離線：用 localStorage */ }
}
