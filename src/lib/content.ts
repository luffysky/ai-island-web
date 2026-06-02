import { Chapter, Lesson } from './types';
import fs from 'fs';
import path from 'path';
import { createSupabaseAdmin } from './supabase-admin';

/**
 * 章節資料源優先序：
 * 1. DB (chapters + lessons tables) — 後台改了立刻生效
 * 2. JSON 檔 (src/data/chapters/chXX.json) — fallback、首次部署 / DB 失敗時用
 *
 * 切換來源：set NEXT_PUBLIC_CONTENT_SOURCE=file 強制走 file（debug 用）。
 */

const FORCE_FILE = process.env.NEXT_PUBLIC_CONTENT_SOURCE === 'file';

// in-memory cache（1 分鐘、reduce DB hit）
const CACHE_TTL_MS = 60_000;
type CacheEntry<T> = { at: number; data: T };
const chapterCache = new Map<number, CacheEntry<Chapter | null>>();
let allCache: CacheEntry<Chapter[]> | null = null;
let metaCache: CacheEntry<ReturnType<typeof toMetas>> | null = null;
let navCache: CacheEntry<any[]> | null = null;

function isFresh(at: number): boolean { return Date.now() - at < CACHE_TTL_MS; }

export function invalidateContentCache() {
  chapterCache.clear();
  allCache = null;
  metaCache = null;
  navCache = null;
}

// 從 file 讀（fallback）
function readChapterFromFile(id: number): Chapter | null {
  const filePath = path.join(process.cwd(), 'src/data/chapters', `ch${String(id).padStart(2, '0')}.json`);
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
}

function readAllFromFile(): Chapter[] {
  const dir = path.join(process.cwd(), 'src/data/chapters');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  return files.map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')); } catch { return null; }
  }).filter(Boolean) as Chapter[];
}

// 把 DB row 還原成 Chapter 物件結構
function rowToChapter(chRow: any, lessonRows: any[]): Chapter {
  const lessons: Lesson[] = (lessonRows ?? [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((l) => ({
      id: l.id,
      number: l.number,
      title: l.title,
      oneLineSummary: l.one_line_summary ?? undefined,
      analogy: l.analogy ?? undefined,
      content: l.content ?? undefined,
      outline: l.outline ?? undefined,
      resourceGroups: l.resource_groups ?? undefined,
      tip: l.tip ?? undefined,
      exercise: l.exercise ?? undefined,
      playgrounds: l.playgrounds ?? [],
      miniQuiz: l.mini_quiz ?? undefined,
      files: l.files ?? undefined,
      xp: l.xp ?? 10,
    } as any));

  return {
    id: chRow.id,
    slug: chRow.slug ?? undefined,
    stage: chRow.stage,
    sortIndex: chRow.sort_index ?? undefined,
    title: chRow.title,
    subtitle: chRow.subtitle ?? undefined,
    icon: chRow.icon ?? undefined,
    description: chRow.description ?? undefined,
    status: chRow.status,
    difficulty: chRow.difficulty,
    prerequisites: chRow.prerequisites ?? [],
    estimatedHours: chRow.estimated_hours ?? 0,
    outcomes: chRow.outcomes ?? [],
    boss: chRow.boss ?? undefined,
    summary: chRow.summary ?? [],
    faq: chRow.faq ?? [],
    lessons,
  } as any;
}

// chapter 顯示排序：sortIndex 優先、無則回退 id (新章節用 8.5 / 9.5 插入既有 stage)
function sortChapters(list: Chapter[]): Chapter[] {
  return [...list].sort((a, b) => {
    const ai = (a as any).sortIndex ?? a.id;
    const bi = (b as any).sortIndex ?? b.id;
    return ai - bi;
  });
}

// ============ Public API ============
export async function getChapter(id: number): Promise<Chapter | null> {
  const cached = chapterCache.get(id);
  if (cached && isFresh(cached.at)) return cached.data;

  let result: Chapter | null = null;
  if (!FORCE_FILE) {
    try {
      const admin = createSupabaseAdmin();
      const { data: chRow } = await admin.from('chapters').select('*').eq('id', id).maybeSingle();
      if (chRow) {
        const { data: lessonRows } = await admin.from('lessons').select('*').eq('chapter_id', id);
        result = rowToChapter(chRow, (lessonRows as any[]) ?? []);
      }
    } catch (e) {
      console.warn('[content] getChapter DB fail, fallback file:', (e as any)?.message);
    }
  }
  if (!result) result = readChapterFromFile(id);

  chapterCache.set(id, { at: Date.now(), data: result });
  return result;
}

export async function getAllChapters(): Promise<Chapter[]> {
  if (allCache && isFresh(allCache.at)) return allCache.data;

  let chapters: Chapter[] = [];
  if (!FORCE_FILE) {
    try {
      const admin = createSupabaseAdmin();
      const { data: chRows } = await admin.from('chapters').select('*');
      const { data: allLessons } = await admin.from('lessons').select('*');
      if (chRows && chRows.length > 0) {
        const byCh = new Map<number, any[]>();
        for (const l of (allLessons as any[]) ?? []) {
          if (!byCh.has(l.chapter_id)) byCh.set(l.chapter_id, []);
          byCh.get(l.chapter_id)!.push(l);
        }
        chapters = (chRows as any[]).map((c) => rowToChapter(c, byCh.get(c.id) ?? []));
      }
    } catch (e) {
      console.warn('[content] getAllChapters DB fail, fallback file:', (e as any)?.message);
    }
  }
  if (chapters.length === 0) chapters = readAllFromFile();

  chapters = sortChapters(chapters);
  allCache = { at: Date.now(), data: chapters };
  return chapters;
}

function toMetas(chapters: Chapter[]) {
  return chapters.map((c) => ({
    id: c.id,
    slug: c.slug,
    stage: c.stage,
    sortIndex: (c as any).sortIndex,
    title: c.title,
    subtitle: c.subtitle,
    icon: c.icon,
    description: c.description,
    status: c.status,
    difficulty: c.difficulty,
    estimatedHours: c.estimatedHours,
    lessonCount: c.lessons?.length ?? 0,
    boss: c.boss,
    updatedAt: (c as any).updatedAt ?? undefined,
  }));
}

// metas 不需要 lesson 內容：只拉 chapters + lesson 的 chapter_id 來算數量（省 egress）。
export async function getChapterMetas() {
  if (metaCache && isFresh(metaCache.at)) return metaCache.data;

  let metas: any[] | null = null;
  if (!FORCE_FILE) {
    try {
      const admin = createSupabaseAdmin();
      const { data: chRows } = await admin.from('chapters').select('*');
      if (chRows && chRows.length > 0) {
        const { data: lessonIds } = await admin.from('lessons').select('chapter_id');
        const counts = new Map<number, number>();
        for (const l of (lessonIds as any[]) ?? []) counts.set(l.chapter_id, (counts.get(l.chapter_id) ?? 0) + 1);
        metas = (chRows as any[]).map((c) => ({
          id: c.id,
          slug: c.slug ?? undefined,
          stage: c.stage,
          sortIndex: c.sort_index ?? undefined,
          title: c.title,
          subtitle: c.subtitle ?? undefined,
          icon: c.icon ?? undefined,
          description: c.description ?? undefined,
          status: c.status,
          difficulty: c.difficulty,
          estimatedHours: c.estimated_hours ?? 0,
          lessonCount: counts.get(c.id) ?? 0,
          boss: c.boss ?? undefined,
          updatedAt: c.updated_at ?? undefined,
        }));
        metas.sort((a, b) => ((a.sortIndex ?? a.id) as number) - ((b.sortIndex ?? b.id) as number));
      }
    } catch (e) {
      console.warn('[content] getChapterMetas DB fail, fallback file:', (e as any)?.message);
    }
  }
  if (!metas) metas = toMetas(sortChapters(readAllFromFile()));

  metaCache = { at: Date.now(), data: metas as any };
  return metas;
}

// 側邊欄導覽用：chapters + lesson 的 id/number/title/outline（不拉 content、省 egress）。
export async function getNavChapters() {
  if (navCache && isFresh(navCache.at)) return navCache.data;

  let chapters: any[] = [];
  if (!FORCE_FILE) {
    try {
      const admin = createSupabaseAdmin();
      const { data: chRows } = await admin.from('chapters').select('*');
      if (chRows && chRows.length > 0) {
        const { data: lessonRows } = await admin
          .from('lessons')
          .select('id, number, title, outline, chapter_id, sort_order');
        const byCh = new Map<number, any[]>();
        for (const l of (lessonRows as any[]) ?? []) {
          if (!byCh.has(l.chapter_id)) byCh.set(l.chapter_id, []);
          byCh.get(l.chapter_id)!.push(l);
        }
        chapters = (chRows as any[]).map((c) => ({
          id: c.id, title: c.title, subtitle: c.subtitle ?? undefined,
          stage: c.stage, icon: c.icon ?? undefined, difficulty: c.difficulty,
          sortIndex: c.sort_index ?? undefined,
          lessons: (byCh.get(c.id) ?? [])
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((l) => ({ id: l.id, number: l.number, title: l.title, outline: l.outline ?? [] })),
        }));
      }
    } catch (e) {
      console.warn('[content] getNavChapters DB fail, fallback file:', (e as any)?.message);
    }
  }
  if (chapters.length === 0) {
    chapters = readAllFromFile().map((c: any) => ({
      id: c.id, title: c.title, subtitle: c.subtitle, stage: c.stage, icon: c.icon,
      difficulty: c.difficulty, sortIndex: (c as any).sortIndex,
      lessons: (c.lessons ?? []).map((l: any) => ({ id: l.id, number: l.number, title: l.title, outline: l.outline ?? [] })),
    }));
  }
  chapters = sortChapters(chapters as any);
  navCache = { at: Date.now(), data: chapters };
  return chapters;
}
