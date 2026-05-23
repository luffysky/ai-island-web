/**
 * L1 keyword 過濾（最便宜層、< 1ms）。
 * 用 ai_moderation_keywords 表的 enabled keyword 掃 text。
 * 命中 → 寫 ai_moderation_flags + 回傳 severity / category。
 *
 * 任何審核失敗 fail-soft、不阻斷使用者操作。
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";

type ModerationHit = {
  matched: string[];
  worstSeverity: "info" | "warn" | "high" | "critical";
  categories: string[];
};

let cachedKeywords: { keyword: string; severity: string; category: string }[] | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 分鐘 refresh

async function loadKeywords() {
  if (cachedKeywords && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return cachedKeywords;
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("ai_moderation_keywords")
      .select("keyword, severity, category")
      .eq("enabled", true);
    cachedKeywords = (data ?? []) as any;
    cacheLoadedAt = Date.now();
    return cachedKeywords;
  } catch {
    return cachedKeywords ?? [];
  }
}

const sevRank: Record<string, number> = { info: 1, warn: 2, high: 3, critical: 4 };

export async function scanContent(text: string): Promise<ModerationHit | null> {
  if (!text) return null;
  const keywords = (await loadKeywords()) ?? [];
  if (keywords.length === 0) return null;
  const lower = text.toLowerCase();
  const hits: { keyword: string; severity: string; category: string }[] = [];
  for (const k of keywords) {
    if (lower.includes(k.keyword)) hits.push(k);
  }
  if (hits.length === 0) return null;
  let worst = "info";
  for (const h of hits) if ((sevRank[h.severity] ?? 1) > (sevRank[worst] ?? 1)) worst = h.severity;
  return {
    matched: hits.map((h) => h.keyword),
    worstSeverity: worst as any,
    categories: Array.from(new Set(hits.map((h) => h.category))),
  };
}

export async function flagContent(params: {
  userId: string | null;
  role: "user" | "assistant";
  content: string;
  conversationId?: string | null;
  messageId?: string | null;
  hit: ModerationHit;
}): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    await admin.from("ai_moderation_flags").insert({
      user_id: params.userId,
      role: params.role,
      content_snippet: params.content.slice(0, 2000),
      flag_reason: "keyword",
      severity: params.hit.worstSeverity,
      status: "pending",
      conversation_id: params.conversationId ?? null,
      message_id: params.messageId ?? null,
      meta: {
        matched: params.hit.matched,
        categories: params.hit.categories,
      },
    });
  } catch (e) {
    console.warn("[moderation] flag failed:", e);
  }
}
