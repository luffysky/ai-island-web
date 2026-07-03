/**
 * 跨 channel user AI memory 載入器（Web / LINE / Telegram / Discord 共用）
 *
 * 來源：public.user_ai_memory 表（cron/summarize-memories 每日更新）
 * 用法：buildTutorSystemPrompt 內 await loadUserMemory(userId)、回的格式化字串
 *       直接拼進 system prompt、AI 就能「記得這個 user」。
 *
 * cache：60 秒 in-memory（同個 user 短時間連續多次對話、不必每次打 DB）
 */
import { createSupabaseAdmin } from "./supabase-admin";

export type UserAIMemory = {
  summary: string | null;
  preferences: {
    style?: string;
    tone_hints?: string[];
    jargon_familiar?: string[];
    jargon_unfamiliar?: string[];
    [k: string]: any;
  };
  topics: Array<{ topic: string; count: number }>;
  turn_count: number;
  last_summarized_at: string | null;
};

const cache = new Map<string, { mem: UserAIMemory | null; at: number }>();
const TTL = 60_000;

export async function loadUserMemory(userId: string | null | undefined): Promise<UserAIMemory | null> {
  if (!userId) return null;
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return hit.mem;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("user_ai_memory")
    .select("summary, preferences, topics, turn_count, last_summarized_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    cache.set(userId, { mem: null, at: Date.now() });
    return null;
  }

  const mem: UserAIMemory = {
    summary: (data as any).summary ?? null,
    preferences: (data as any).preferences ?? {},
    topics: Array.isArray((data as any).topics) ? (data as any).topics : [],
    turn_count: (data as any).turn_count ?? 0,
    last_summarized_at: (data as any).last_summarized_at ?? null,
  };
  cache.set(userId, { mem, at: Date.now() });
  return mem;
}

/** 把 memory 格式化進 system prompt（不到 100 字、佔少量 token） */
export function formatMemoryForPrompt(mem: UserAIMemory | null): string {
  if (!mem) return "";
  const p = mem.preferences || {};
  // 使用者關掉「記住我的偏好」→ 完全不注入任何長期記憶（尊重 opt-out）
  if (p.remember_enabled === false) return "";

  const parts: string[] = [];
  parts.push("\n# 你對這位 user 的長期記憶（從 N 次對話累積、隨時更新）");

  if (mem.summary) {
    parts.push(`- 近期狀態：${mem.summary}`);
  }

  // 使用者自訂指示（來自 /me/ai 的自訂 prompt）— 最高優先、要遵守
  if (typeof p.custom_prompt === "string" && p.custom_prompt.trim()) {
    parts.push(`- 使用者自訂指示（請優先遵守）：${p.custom_prompt.trim().slice(0, 800)}`);
  }
  // 語氣偏好
  const toneLabels: Record<string, string> = {
    short: "簡短扼要",
    detailed: "詳細完整",
    encouraging: "鼓勵溫暖",
    direct: "直接切重點",
  };
  if (typeof p.tone === "string" && p.tone.trim()) {
    parts.push(`- 語氣偏好：${toneLabels[p.tone] || p.tone}`);
  }

  if (p.style) parts.push(`- 風格：${p.style}`);
  if (Array.isArray(p.tone_hints) && p.tone_hints.length > 0) {
    parts.push(`- 風格提示：${p.tone_hints.slice(0, 3).join(" / ")}`);
  }
  if (Array.isArray(p.jargon_familiar) && p.jargon_familiar.length > 0) {
    parts.push(`- 已熟悉術語：${p.jargon_familiar.slice(0, 8).join(", ")}（不用再解釋）`);
  }
  if (Array.isArray(p.jargon_unfamiliar) && p.jargon_unfamiliar.length > 0) {
    parts.push(`- 還卡關的術語：${p.jargon_unfamiliar.slice(0, 5).join(", ")}（用到先解釋）`);
  }
  if (mem.topics.length > 0) {
    const topTopics = mem.topics.slice(0, 5).map((t) => `${t.topic}(×${t.count})`).join(", ");
    parts.push(`- 常聊主題：${topTopics}`);
  }
  parts.push("- 用這些記憶讓你的回應更貼近這個 user、不要在回覆中明示「我記得你」、要自然體現");

  return parts.join("\n");
}

export function invalidateMemoryCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/**
 * upsert user_ai_memory 一列、把 patch 合併進 preferences JSONB（不覆蓋其他 key）、
 * 並可選擇更新 summary。用於 /me/ai 使用者自行編輯記憶/偏好。
 *
 * patch 可含：{ custom_prompt?, tone?, remember_enabled?, ...任意 preferences key }
 * 若帶 summary（string | null）→ 一併更新 summary 欄位。
 */
export async function setUserAiPreferences(
  userId: string,
  patch: {
    summary?: string | null;
    preferences?: Record<string, any>;
  },
): Promise<UserAIMemory | null> {
  if (!userId) return null;
  const admin = createSupabaseAdmin();

  // 讀現有列、拿到目前的 preferences 以便 merge（不 clobber 既有 key）
  const { data: existing } = await admin
    .from("user_ai_memory")
    .select("summary, preferences, topics, turn_count, last_summarized_at")
    .eq("user_id", userId)
    .maybeSingle();

  const currentPrefs = (existing as any)?.preferences ?? {};
  const mergedPrefs = { ...currentPrefs, ...(patch.preferences ?? {}) };

  const row: Record<string, any> = {
    user_id: userId,
    preferences: mergedPrefs,
    updated_at: new Date().toISOString(),
  };
  if ("summary" in patch) row.summary = patch.summary;

  const { data, error } = await admin
    .from("user_ai_memory")
    .upsert(row, { onConflict: "user_id" })
    .select("summary, preferences, topics, turn_count, last_summarized_at")
    .maybeSingle();

  invalidateMemoryCache(userId);
  if (error || !data) return null;

  return {
    summary: (data as any).summary ?? null,
    preferences: (data as any).preferences ?? {},
    topics: Array.isArray((data as any).topics) ? (data as any).topics : [],
    turn_count: (data as any).turn_count ?? 0,
    last_summarized_at: (data as any).last_summarized_at ?? null,
  };
}
