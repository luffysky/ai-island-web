import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { generateEmbedding, toPgVector } from "@/lib/embeddings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/search?q=...&type=chapter,blog&n=10
 *
 * 公開語意搜尋、回最相似的 top N 個內容（章節 / 副本 / 部落格 / 論壇）。
 * type 不傳 = 全部、可逗號分隔限類型。
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "query_too_short", min: 2 }, { status: 400 });
  }
  const n = Math.max(1, Math.min(20, parseInt(req.nextUrl.searchParams.get("n") ?? "10", 10) || 10));
  const typeFilter = req.nextUrl.searchParams.get("type") ?? null;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "openai_key_not_set" }, { status: 503 });
  }

  let queryEmbedding: number[];
  try {
    const r = await generateEmbedding(q);
    queryEmbedding = r.embedding;
  } catch (e: any) {
    return NextResponse.json({ error: "embedding_failed", message: e?.message }, { status: 500 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("search_content_by_embedding", {
    query_embedding: toPgVector(queryEmbedding),
    match_count: n,
    type_filter: typeFilter,
  });

  if (error) {
    return NextResponse.json({ error: "search_rpc_failed", message: error.message }, { status: 500 });
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
