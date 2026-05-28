/**
 * AI Embeddings — OpenAI text-embedding-3-small (1536 維、便宜、品質好)
 *
 * 用途：
 *   - 學員 LINE AI search_lessons / search_forum 的語意搜尋後端
 *   - 把學員問題 embed → 跟 lesson_embeddings / forum_thread_embeddings 做 cosine 比較
 *
 * 設計：
 *   - 從 ai_api_keys 表拿 openai key（system level、不走 user BYOK）
 *   - embedding 失敗時 throw、caller 用 ILIKE fallback
 *   - 結果用 RPC `match_lessons` / `match_forum_threads` 走 pgvector cosine
 *   - 沒裝 pgvector 或沒 backfill 的話 RPC 會 throw、caller fallback ILIKE
 */
import { createSupabaseAdmin } from "./supabase-admin";
import { decryptKey } from "./ai-crypto";
import { getModelNameForUsage } from "./ai-usage-models";

const DEFAULT_EMBED_MODEL = "text-embedding-3-small";  // fallback；後台改 usage_key=embedding 即覆蓋
const EMBED_DIM = 1536;

let cachedKey: { key: string; ts: number } | null = null;
const KEY_CACHE_TTL = 5 * 60 * 1000;  // 5 分鐘

async function getOpenAIKey(): Promise<string | null> {
  if (cachedKey && Date.now() - cachedKey.ts < KEY_CACHE_TTL) return cachedKey.key;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", "openai")
    .maybeSingle();
  if (!data || !(data as any).enabled) return null;
  try {
    const key = decryptKey((data as any).api_key_encrypted);
    cachedKey = { key, ts: Date.now() };
    return key;
  } catch {
    return null;
  }
}

export async function embedText(text: string): Promise<number[] | null> {
  const key = await getOpenAIKey();
  if (!key) return null;
  const input = text.slice(0, 8000);  // OpenAI 限制 8192 token、保守抓 8000 字元
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: await getModelNameForUsage("embedding", DEFAULT_EMBED_MODEL), input }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[ai-embeddings] embed failed ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const vec = data?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== EMBED_DIM) return null;
    return vec;
  } catch (e: any) {
    console.warn("[ai-embeddings] embed error:", e?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type LessonHit = {
  lesson_id: string;
  chapter_id: number;
  title: string;
  summary: string | null;
  similarity: number;
};

export async function vectorSearchLessons(query: string, limit = 5): Promise<LessonHit[]> {
  const vec = await embedText(query);
  if (!vec) return [];
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("match_lessons", {
    query_embedding: vec,
    match_count: Math.min(20, limit),
  });
  if (error) {
    console.warn("[ai-embeddings] match_lessons RPC failed:", error.message);
    return [];
  }
  return (data ?? []) as LessonHit[];
}

export type ForumHit = {
  thread_id: string;
  title: string;
  snippet: string | null;
  reply_count: number;
  similarity: number;
};

export async function vectorSearchForum(query: string, limit = 5): Promise<ForumHit[]> {
  const vec = await embedText(query);
  if (!vec) return [];
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("match_forum_threads", {
    query_embedding: vec,
    match_count: Math.min(20, limit),
  });
  if (error) {
    console.warn("[ai-embeddings] match_forum_threads RPC failed:", error.message);
    return [];
  }
  return (data ?? []) as ForumHit[];
}

export { DEFAULT_EMBED_MODEL as EMBED_MODEL, EMBED_DIM };
