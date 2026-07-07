import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { slugify } from "@/lib/blog-types";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { authorId, title, summary?, content, tags?, category? } → 以某 persona 身分發一篇公開部落格文章。 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const b = await req.json().catch(() => ({} as any));
  const authorId = String(b.authorId ?? "");
  const title = String(b.title ?? "").trim().slice(0, 200);
  const content = sanitizeRichHtmlStrict(String(b.content ?? ""));
  const summary = b.summary ? String(b.summary).slice(0, 500) : null;
  const tags: string[] = Array.isArray(b.tags) ? b.tags.map((t: any) => String(t).slice(0, 50)).slice(0, 12) : [];
  const category = b.category ? String(b.category).slice(0, 60) : null;
  if (!authorId || !title || !content.trim()) return NextResponse.json({ error: "missing", message: "缺 作者 / 標題 / 內文" }, { status: 422 });

  const admin = createSupabaseAdmin();
  const { data: persona } = await admin.from("profiles").select("id, username").eq("id", authorId).maybeSingle();
  if (!persona) return NextResponse.json({ error: "author_not_found" }, { status: 404 });

  // slug 撞名加數字
  const base = slugify(title) || "post";
  let slug = base, n = 1;
  while (true) {
    const { data: ex } = await admin.from("user_blog_articles").select("id").eq("user_id", authorId).eq("slug", slug).maybeSingle();
    if (!ex) break;
    slug = `${base}-${++n}`;
  }

  const { data, error } = await admin.from("user_blog_articles").insert({
    user_id: authorId, title, slug, summary, content, tags, category, is_public: true,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 確保作者有 blog_settings（否則 /blogs 列不出來）
  await admin.from("user_blog_settings").upsert({ user_id: authorId, is_enabled: true }, { onConflict: "user_id", ignoreDuplicates: true });

  return NextResponse.json({ ok: true, id: (data as any).id, slug, href: `/blogs/${(persona as any).username ?? authorId}/${slug}` });
}
