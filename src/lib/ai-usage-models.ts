/**
 * AI 用途 ↔ 模型對應 helper
 *
 * 每個 AI 場景 (line_admin / line_user / nami / ai_tutor 等) 可以獨立指定 model。
 * 來源：public.ai_usage_models 表、admin UI 可改。
 *
 * 用法：
 *   const model = await pickModelForUsage("line_admin", activeModels);
 *   // 找不到設定就回 null、caller fallback 到自己的 logic
 */

import { createSupabaseAdmin } from "./supabase-admin";

export type AiUsageKey =
  | "line_admin"
  | "line_user"
  | "ai_tutor"
  | "nami_challenge_gen"
  | "nami_help"
  | "content_moderation"
  | "blog_writer"
  | "chapter_quiz_gen"
  | "seo_meta_gen"
  | "admin_assistant";

export const USAGE_LABELS: Record<AiUsageKey, string> = {
  line_admin:         "LINE admin bot 對話 / tool use",
  line_user:          "LINE user bot 學員導師",
  ai_tutor:           "站內 AI 學員導師 (聊天視窗)",
  nami_challenge_gen: "Nami 出題 AI",
  nami_help:          "Nami Playground 問 AI",
  content_moderation: "留言 / 論壇審核",
  blog_writer:        "部落格 AI 撰文助手",
  chapter_quiz_gen:   "章節 quiz 自動出題",
  seo_meta_gen:       "SEO meta 自動生成",
  admin_assistant:    "後台一般 AI 助理",
};

// in-memory cache (1 min)
let cache: { at: number; data: Record<string, string> } | null = null;
const TTL = 60_000;

async function loadUsageMap(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ai_usage_models")
    .select("usage_key, model_name, enabled");
  const map: Record<string, string> = {};
  for (const r of (data as any[]) ?? []) {
    if (r.enabled !== false) map[r.usage_key] = r.model_name;
  }
  cache = { at: Date.now(), data: map };
  return map;
}

export function invalidateUsageCache() {
  cache = null;
}

/**
 * 給用途、從 active models 撈出該用途指定的 model object。
 * 找不到設定 / 設定的 model 不在 active 列 → 回 null、caller 自己 fallback。
 */
export async function pickModelForUsage(
  usage: AiUsageKey,
  activeModels: Array<{ model_name: string; provider: string; [k: string]: any }>,
): Promise<{ model_name: string; provider: string; [k: string]: any } | null> {
  const map = await loadUsageMap();
  const wanted = map[usage];
  if (!wanted) return null;
  return activeModels.find((m) => m.model_name === wanted) ?? null;
}
