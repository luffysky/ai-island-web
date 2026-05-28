import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { generateEmbeddingsBatch, toPgVector } from "@/lib/embeddings";
import { getProviderKey } from "@/lib/ai-crypto";
import { getAllChapters } from "@/lib/content";
import { DUNGEONS } from "@/data/dungeons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

/**
 * POST /api/admin/embeddings/reindex
 *
 * admin 一鍵重建全站 embeddings、跑批：
 *   - 71 章節（用 title + subtitle + description + outcomes）
 *   - 副本（用 name + tagline + intro）
 *   - 公開部落格文章（title + summary）
 *   - 論壇主題（title + content 前 500 字）
 *
 * 一次跑大約 1-2 分鐘、成本 < $1。
 * 跑完後語意搜尋立即生效。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!(await getProviderKey("openai"))) {
    return NextResponse.json({ error: "openai_key_not_set" }, { status: 503 });
  }

  const admin = createSupabaseAdmin();
  const types = String(req.nextUrl.searchParams.get("types") ?? "all").split(",").map((s) => s.trim());
  const doAll = types.includes("all");

  // 收集所有要 embedding 的 row
  type Doc = {
    content_type: string;
    content_id: string;
    title: string;
    snippet: string;
    url: string;
    text: string;       // 給 embedding 用的文本
    meta?: any;
  };
  const docs: Doc[] = [];

  if (doAll || types.includes("chapter")) {
    const chapters = await getAllChapters();
    for (const c of chapters as any[]) {
      const text = [c.title, c.subtitle, c.description, ...(c.outcomes ?? [])].filter(Boolean).join("\n");
      docs.push({
        content_type: "chapter",
        content_id: String(c.id),
        title: `Ch${String(c.id).padStart(2, "0")} ${c.title}`,
        snippet: (c.description || c.subtitle || c.title).slice(0, 200),
        url: `${SITE_URL}/chapters/${c.id}`,
        text,
        meta: { difficulty: c.difficulty, stage: c.stage },
      });
    }
  }

  if (doAll || types.includes("dungeon")) {
    for (const d of DUNGEONS) {
      const text = [d.name, d.subtitle, d.tagline, (d as any).intro, ...((d as any).tools?.map((t: any) => t.name) ?? [])].filter(Boolean).join("\n");
      docs.push({
        content_type: "dungeon",
        content_id: d.slug,
        title: `${d.emoji} ${d.name}`,
        snippet: (d.subtitle || d.tagline || d.name).slice(0, 200),
        url: `${SITE_URL}/courses/${d.slug}`,
        text,
      });
    }
  }

  if (doAll || types.includes("blog")) {
    const { data: articles } = await admin
      .from("user_blog_articles")
      .select("id, slug, title, summary, content, user_id, profiles(username)")
      .eq("is_public", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(500);
    for (const a of (articles as any[]) ?? []) {
      const text = [a.title, a.summary, String(a.content ?? "").replace(/<[^>]+>/g, "").slice(0, 4000)].filter(Boolean).join("\n");
      const userSlug = a.profiles?.username;
      if (!userSlug) continue;
      docs.push({
        content_type: "blog",
        content_id: `${userSlug}/${a.slug}`,
        title: a.title,
        snippet: (a.summary || String(a.content ?? "").replace(/<[^>]+>/g, "")).slice(0, 200),
        url: `${SITE_URL}/blogs/${userSlug}/${a.slug}`,
        text,
        meta: { author: userSlug },
      });
    }
  }

  if (doAll || types.includes("forum")) {
    const { data: threads } = await admin
      .from("forum_threads")
      .select("id, title, content, board_slug:forum_boards(slug)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    for (const t of (threads as any[]) ?? []) {
      const text = [t.title, String(t.content ?? "").replace(/<[^>]+>/g, "").slice(0, 2000)].filter(Boolean).join("\n");
      docs.push({
        content_type: "forum_thread",
        content_id: String(t.id),
        title: t.title,
        snippet: String(t.content ?? "").replace(/<[^>]+>/g, "").slice(0, 200),
        url: `${SITE_URL}/forum/thread/${t.id}`,
        text,
      });
    }
  }

  if (docs.length === 0) {
    return NextResponse.json({ ok: true, indexed: 0, message: "no_docs_to_index" });
  }

  // 批次跑 embedding，每批 50 條（OpenAI 限制 max 100）
  const BATCH = 50;
  let totalTokens = 0;
  let inserted = 0;
  const errors: any[] = [];

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    try {
      const results = await generateEmbeddingsBatch(batch.map((d) => d.text));
      // upsert
      const rows = batch.map((d, idx) => ({
        content_type: d.content_type,
        content_id: d.content_id,
        title: d.title,
        snippet: d.snippet,
        url: d.url,
        embedding: toPgVector(results[idx].embedding),
        meta: d.meta ?? null,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await admin
        .from("content_embeddings")
        .upsert(rows, { onConflict: "content_type,content_id" });
      if (error) {
        errors.push({ batch_start: i, error: error.message });
      } else {
        inserted += batch.length;
      }
      totalTokens += results.reduce((s, r) => s + r.tokens, 0);
    } catch (e: any) {
      errors.push({ batch_start: i, error: e?.message ?? "unknown" });
    }
  }

  // 估成本（text-embedding-3-small $0.02 / 1M token）
  const estCostUsd = (totalTokens / 1_000_000) * 0.02;

  return NextResponse.json({
    ok: errors.length === 0,
    indexed: inserted,
    total_docs: docs.length,
    tokens: totalTokens,
    estimated_cost_usd: estCostUsd.toFixed(4),
    errors: errors.length > 0 ? errors : undefined,
  });
}
