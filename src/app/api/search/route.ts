import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { generateEmbedding, toPgVector } from "@/lib/embeddings";
import { getProviderKey } from "@/lib/ai-crypto";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 允許的內容類型（防 type 參數亂帶）
const VALID_TYPES = new Set(["chapter", "dungeon", "blog", "forum_thread"]);

// 每個 IP 每分鐘最多 20 次 embed 查詢（embed 要花錢、擋濫用）
const RL_LIMIT = 20;
const RL_WINDOW_MS = 60_000;

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : "") || req.headers.get("x-real-ip") || "unknown";
  return `search:${ip.trim()}`;
}

/**
 * GET /api/search?q=...&type=chapter,blog&n=10
 *
 * 公開語意搜尋、回最相似的 top N 個內容（章節 / 副本 / 部落格 / 論壇）。
 * type 不傳 = 全部、可逗號分隔限類型。
 * 走 match_content_embeddings RPC（cosine、pgvector）。
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "query_too_short", min: 2 }, { status: 400 });
  }
  // query 太長直接砍、避免有人塞大 payload 灌 embed 成本
  if (q.length > 300) {
    return NextResponse.json({ error: "query_too_long", max: 300 }, { status: 400 });
  }

  // rate limit（embed 前先擋、省 OpenAI 花費）
  const rl = rateLimit(clientKey(req), RL_LIMIT, RL_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } },
    );
  }

  const n = Math.max(1, Math.min(20, parseInt(req.nextUrl.searchParams.get("n") ?? "10", 10) || 10));

  // type filter → text[] 白名單（過濾非法值；空 = 全部）
  const rawTypes = req.nextUrl.searchParams.get("type") ?? "";
  const types = rawTypes
    .split(",")
    .map((t) => t.trim())
    .filter((t) => VALID_TYPES.has(t));
  const pTypes = types.length > 0 ? types : null;

  if (!(await getProviderKey("openai"))) {
    return NextResponse.json({ error: "openai_key_not_set", results: [] }, { status: 503 });
  }

  let queryEmbedding: number[];
  try {
    const r = await generateEmbedding(q);
    queryEmbedding = r.embedding;
  } catch (e: any) {
    return NextResponse.json({ error: "embedding_failed", message: e?.message, results: [] }, { status: 500 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("match_content_embeddings", {
    p_embedding: toPgVector(queryEmbedding),
    p_limit: n,
    p_types: pTypes,
  });

  if (error) {
    return NextResponse.json({ error: "search_rpc_failed", message: error.message, results: [] }, { status: 500 });
  }

  return NextResponse.json({
    query: q,
    results: (data ?? []).map((r: any) => ({
      type: r.content_type,
      id: r.content_id,
      title: r.title,
      snippet: r.snippet,
      url: r.url,
      similarity: r.similarity,
      meta: r.meta,
    })),
  });
}
