/**
 * AI 生成關卡（DB）→ 併進遊戲。目前支援 number 型（純 stdout 比對）。
 * 全部走 service-role（server 端）：遊戲 route / 副本地圖 / 發獎驗證都從這裡撈。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { NumberLevel } from "./number-levels";

type Row = {
  level_id: string; title: string; concept: string; chapter_id: number | null;
  intro: string; hint: string; expect: string; starter: string;
  par_lines: number; xp: number; z: number;
};

function rowToNumberLevel(r: Row): NumberLevel {
  return {
    id: r.level_id, title: r.title, concept: r.concept,
    chapterHref: r.chapter_id ? `/chapters/${r.chapter_id}` : "/chapters",
    intro: r.intro, hint: r.hint, expect: r.expect, starter: r.starter,
    parLines: r.par_lines, xp: r.xp, z: r.z,
  };
}

export async function getDbNumberLevel(id: string): Promise<NumberLevel | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("quest_ai_levels").select("*").eq("level_id", id).eq("game_type", "number").eq("approved", true).maybeSingle();
    return data ? rowToNumberLevel(data as any) : null;
  } catch { return null; }
}

export async function listDbNumberLevels(): Promise<NumberLevel[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("quest_ai_levels").select("*").eq("game_type", "number").eq("approved", true).order("created_at");
    return ((data as any[]) ?? []).map(rowToNumberLevel);
  } catch { return []; }
}

/** 發獎驗證用：任一 DB 關卡的 xp/z。 */
export async function getDbAnyLevel(id: string): Promise<{ id: string; xp: number; z: number } | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("quest_ai_levels").select("level_id, xp, z").eq("level_id", id).eq("approved", true).maybeSingle();
    return data ? { id: (data as any).level_id, xp: (data as any).xp, z: (data as any).z } : null;
  } catch { return null; }
}
