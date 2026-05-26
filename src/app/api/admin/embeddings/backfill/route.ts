import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { decryptKey } from "@/lib/ai-crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;  // backfill 全部可能 2-3 分鐘、Vercel pro 上限 300

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("role, id, username").eq("id", user.id).single();
  if (p?.role !== "admin") return null;
  return p;
}

async function getOpenAIKey(admin: ReturnType<typeof createSupabaseAdmin>): Promise<string | null> {
  const { data } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", "openai")
    .maybeSingle();
  if (!data || !(data as any).enabled) return null;
  try { return decryptKey((data as any).api_key_encrypted); } catch { return null; }
}

async function embedBatch(apiKey: string, texts: string[]): Promise<number[][]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI ${res.status}: ${err.slice(0, 300)}`);
    }
    const data = await res.json();
    return data.data.map((d: any) => d.embedding);
  } finally {
    clearTimeout(t);
  }
}

// POST { target?: "lessons" | "forum" | "all", force?: boolean }
export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const target = (body.target as string) || "all";
  const force = !!body.force;

  const admin = createSupabaseAdmin();
  const apiKey = await getOpenAIKey(admin);
  if (!apiKey) {
    return NextResponse.json({
      error: "no_openai_key",
      hint: "去 /admin/ai-keys 啟用 openai provider key",
    }, { status: 400 });
  }

  const summary: any = { lessons: null, forum: null };

  if (target === "lessons" || target === "all") {
    summary.lessons = await backfillLessons(admin, apiKey, force);
  }
  if (target === "forum" || target === "all") {
    summary.forum = await backfillForumThreads(admin, apiKey, force);
  }

  return NextResponse.json({ ok: true, summary });
}

async function backfillLessons(admin: ReturnType<typeof createSupabaseAdmin>, apiKey: string, force: boolean) {
  let q = admin
    .from("lessons")
    .select("id, chapter_id, number, title, one_line_summary, analogy, content")
    .order("chapter_id", { ascending: true });
  if (!force) q = q.is("embedding", null);
  const { data: rows, error } = await q;
  if (error) return { error: error.message, done: 0, total: 0 };
  if (!rows || rows.length === 0) return { done: 0, total: 0, skipped: "all already embedded" };

  const BATCH = 20;
  let done = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const texts = batch.map((r: any) =>
      [
        `Chapter ${r.chapter_id} Lesson ${r.number}: ${r.title}`,
        r.one_line_summary || "",
        r.analogy || "",
        String(r.content || "").slice(0, 6000),
      ].filter(Boolean).join("\n\n")
    );
    try {
      const vecs = await embedBatch(apiKey, texts);
      // Supabase JS 沒直接寫 vector 的 schema、用 RPC 或 raw SQL；用 .update 傳 array string
      for (let j = 0; j < batch.length; j++) {
        const vecStr = `[${vecs[j].join(",")}]`;
        const { error: upErr } = await admin
          .from("lessons")
          .update({
            embedding: vecStr,
            embedding_updated_at: new Date().toISOString(),
          })
          .eq("id", (batch[j] as any).id);
        if (upErr) {
          console.warn(`[backfill-lessons] update ${(batch[j] as any).id} failed:`, upErr.message);
          failed++;
        } else {
          done++;
        }
      }
    } catch (e: any) {
      console.warn(`[backfill-lessons] batch ${i} failed:`, e?.message);
      failed += batch.length;
    }
  }
  return { done, failed, total: rows.length };
}

async function backfillForumThreads(admin: ReturnType<typeof createSupabaseAdmin>, apiKey: string, force: boolean) {
  let q = admin
    .from("forum_threads")
    .select("id, title, content")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (!force) q = q.is("embedding", null);
  const { data: rows, error } = await q;
  if (error) return { error: error.message, done: 0, total: 0 };
  if (!rows || rows.length === 0) return { done: 0, total: 0, skipped: "all already embedded" };

  const BATCH = 20;
  let done = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const texts = batch.map((r: any) => {
      const plain = String(r.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
      return `${r.title}\n\n${plain}`;
    });
    try {
      const vecs = await embedBatch(apiKey, texts);
      for (let j = 0; j < batch.length; j++) {
        const vecStr = `[${vecs[j].join(",")}]`;
        const { error: upErr } = await admin
          .from("forum_threads")
          .update({
            embedding: vecStr,
            embedding_updated_at: new Date().toISOString(),
          })
          .eq("id", (batch[j] as any).id);
        if (upErr) { failed++; } else { done++; }
      }
    } catch (e: any) {
      console.warn(`[backfill-forum] batch ${i} failed:`, e?.message);
      failed += batch.length;
    }
  }
  return { done, failed, total: rows.length };
}

// GET — 查目前 embedding 覆蓋率
export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createSupabaseAdmin();
  const [
    { count: lessonTotal },
    { count: lessonEmbedded },
    { count: forumTotal },
    { count: forumEmbedded },
  ] = await Promise.all([
    admin.from("lessons").select("*", { count: "exact", head: true }),
    admin.from("lessons").select("*", { count: "exact", head: true }).not("embedding", "is", null),
    admin.from("forum_threads").select("*", { count: "exact", head: true }),
    admin.from("forum_threads").select("*", { count: "exact", head: true }).not("embedding", "is", null),
  ]);

  return NextResponse.json({
    lessons: { total: lessonTotal ?? 0, embedded: lessonEmbedded ?? 0 },
    forum_threads: { total: forumTotal ?? 0, embedded: forumEmbedded ?? 0 },
    model: EMBED_MODEL,
    dim: EMBED_DIM,
  });
}
