/**
 * 綠寶 AI 成本快取（依 greenbao_ai_cost_spec_v0.md）
 *
 * 精確問題快取：相同正規化問題 + 相同情境（tone/persona/context）→ 命中、不燒 token。
 *
 * 鐵則：
 *   - 任何快取失敗都 fail-soft，不影響原本 AI 流程
 *   - 只有「對話第一則訊息」才會走快取（無歷史）
 *   - 多輪對話一律不查、不寫快取
 */

import { createHash } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type CacheKey = {
  tone?: string | null;
  personaId?: string | null;
  contextChapterId?: number | null;
  contextLessonId?: string | null;
};

/**
 * 正規化問題：吸收明顯無意義的差異。
 * - 去頭尾空白
 * - 全形空白 → 半形
 * - 連續空白 → 單一空白
 * - 英文小寫
 * - 移除結尾標點
 */
export function normalizeQuestion(text: string): string {
  if (!text) return "";
  let s = text.trim();
  s = s.replace(/　/g, " "); // 全形空白
  s = s.replace(/\s+/g, " ");    // 連續空白
  s = s.toLowerCase();
  s = s.replace(/[？?。!！～~…\s]+$/u, ""); // 結尾標點
  return s;
}

export function hashQuestion(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * 查快取。
 * 命中條件：question_hash + tone + persona_id + context_chapter_id + context_lesson_id 全部相同。
 * 找到 → 回 { id, answer, modelUsed }；找不到或出錯 → null。
 */
export async function lookupCache(
  question: string,
  key: CacheKey,
): Promise<{ id: string; answer: string; modelUsed: string | null } | null> {
  try {
    const normalized = normalizeQuestion(question);
    if (!normalized) return null;
    const qhash = hashQuestion(normalized);
    const admin = createSupabaseAdmin();
    let q = admin
      .from("ai_response_cache")
      .select("id, answer, model_used")
      .eq("question_hash", qhash);
    // null 值要用 is null（PostgREST 的 eq null 不會 match）
    if (key.tone == null) q = q.is("tone", null); else q = q.eq("tone", key.tone);
    if (key.personaId == null) q = q.is("persona_id", null); else q = q.eq("persona_id", key.personaId);
    if (key.contextChapterId == null) q = q.is("context_chapter_id", null); else q = q.eq("context_chapter_id", key.contextChapterId);
    if (key.contextLessonId == null) q = q.is("context_lesson_id", null); else q = q.eq("context_lesson_id", key.contextLessonId);

    const { data, error } = await q.maybeSingle();
    if (error || !data) return null;
    return { id: data.id, answer: data.answer, modelUsed: data.model_used };
  } catch (e) {
    console.warn("[ai-cache] lookup failed:", e);
    return null;
  }
}

/**
 * 寫快取。撞 UNIQUE 就忽略。
 */
export async function writeCache(
  question: string,
  answer: string,
  modelUsed: string,
  key: CacheKey,
): Promise<void> {
  try {
    const normalized = normalizeQuestion(question);
    if (!normalized || !answer) return;
    const qhash = hashQuestion(normalized);
    const admin = createSupabaseAdmin();
    await admin.from("ai_response_cache").insert({
      question_hash: qhash,
      question_text: question.slice(0, 2000),
      answer,
      tone: key.tone ?? null,
      persona_id: key.personaId ?? null,
      context_chapter_id: key.contextChapterId ?? null,
      context_lesson_id: key.contextLessonId ?? null,
      model_used: modelUsed,
    }).then(() => {}, () => {}); // 撞 UNIQUE 就忽略
  } catch (e) {
    console.warn("[ai-cache] write failed:", e);
  }
}

export async function bumpHit(cacheId: string): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    await admin.rpc("bump_cache_hit", { p_cache_id: cacheId });
  } catch (e) {
    console.warn("[ai-cache] bumpHit failed:", e);
  }
}
