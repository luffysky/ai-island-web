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
  | "line_user_vip"      // LINE 學員導師 — VIP/付費/owner 專用（更強的模型、沒設自動退回 line_user）
  | "ai_tutor"
  | "nami_challenge_gen"
  | "nami_help"
  | "content_moderation"
  | "blog_writer"
  | "chapter_quiz_gen"
  | "seo_meta_gen"
  | "admin_assistant"
  | "embedding"          // 全站 embedding（site search / RAG / 章節索引）
  | "rewrite_lessons"    // 批次 AI 改寫 chapter.analogy / content
  | "pet"                // 寵物 AI 對話（Haiku 級）
  | "agent_core";         // 行動代理系統 — 任務規劃/工具決策 loop

export const USAGE_LABELS: Record<AiUsageKey, string> = {
  line_admin:         "LINE admin bot 對話 / tool use",
  line_user:          "LINE user bot 學員導師",
  line_user_vip:      "LINE 學員導師 — VIP/付費專用（強模型）",
  ai_tutor:           "站內 AI 學員導師 (聊天視窗)",
  nami_challenge_gen: "Nami 出題 AI",
  nami_help:          "Nami Playground 問 AI",
  content_moderation: "留言 / 論壇審核",
  blog_writer:        "部落格 AI 撰文助手",
  chapter_quiz_gen:   "章節 quiz 自動出題",
  seo_meta_gen:       "SEO meta 自動生成",
  admin_assistant:    "後台一般 AI 助理",
  embedding:          "全站 embedding（site search / RAG）",
  rewrite_lessons:    "批次 AI 改寫 chapter 內容",
  pet:                "寵物 AI 對話",
  agent_core:         "行動代理系統（任務規劃 / 工具決策）",
};

/**
 * 拿單一 usage 對應的 model_name 字串（給直接打 API / SELECT ai_models 用）
 * 沒設 → 回 defaultModel；admin 後台 /admin/ai/usage-models 改即時生效（invalidateUsageCache 已串）
 */
export async function getModelNameForUsage(usageKey: AiUsageKey, defaultModel: string): Promise<string> {
  const { models } = await loadUsageMap();
  return models[usageKey] ?? defaultModel;
}

/**
 * 候選模型（智慧路由用）。
 *  - role: primary（先打）/ fallback（前面失敗才退）/ escalate（低信心才升級）
 *  - 存在 ai_usage_models.candidates（JSONB 有序陣列，additive）；元素可為
 *    "model_name" 字串、或 { model, role } 物件。
 */
export type UsageCandidate = { model: string; role: "primary" | "fallback" | "escalate" };

/**
 * 拿某用途的「有序候選模型鏈」。
 * 沒設 candidates → 退回單一 model_name（→ defaultModel），行為與舊版完全一致。
 */
export async function getCandidatesForUsage(
  usageKey: AiUsageKey,
  defaultModel: string,
): Promise<UsageCandidate[]> {
  const { models, candidates } = await loadUsageMap();
  const raw = candidates[usageKey];
  const out: UsageCandidate[] = [];
  if (Array.isArray(raw) && raw.length) {
    for (const item of raw) {
      if (typeof item === "string" && item.trim()) {
        out.push({ model: item.trim(), role: out.length === 0 ? "primary" : "fallback" });
      } else if (item && typeof item === "object" && typeof item.model === "string" && item.model.trim()) {
        const role = item.role === "escalate" || item.role === "fallback" || item.role === "primary"
          ? item.role
          : (out.length === 0 ? "primary" : "fallback");
        out.push({ model: item.model.trim(), role });
      }
    }
  }
  if (out.length) {
    // 保底：至少要有一個 primary
    if (!out.some((c) => c.role === "primary")) out[0].role = "primary";
    return out;
  }
  // 無 candidates：退單一設定 model（維持舊行為）
  const single = models[usageKey] ?? defaultModel;
  return [{ model: single, role: "primary" }];
}

// in-memory cache (1 min)
let cache: { at: number; models: Record<string, string>; candidates: Record<string, any[]> } | null = null;
const TTL = 60_000;

async function loadUsageMap(): Promise<{ models: Record<string, string>; candidates: Record<string, any[]> }> {
  if (cache && Date.now() - cache.at < TTL) return cache;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ai_usage_models")
    .select("usage_key, model_name, enabled, candidates");
  const models: Record<string, string> = {};
  const candidates: Record<string, any[]> = {};
  for (const r of (data as any[]) ?? []) {
    if (r.enabled !== false) {
      models[r.usage_key] = r.model_name;
      if (Array.isArray(r.candidates) && r.candidates.length) candidates[r.usage_key] = r.candidates;
    }
  }
  cache = { at: Date.now(), models, candidates };
  return cache;
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
  const { models } = await loadUsageMap();
  const wanted = models[usage];
  if (!wanted) return null;
  return activeModels.find((m) => m.model_name === wanted) ?? null;
}
