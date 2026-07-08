import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { slugify } from "@/lib/blog-types";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";

/** HTML → 純文字（抓標題用）。 */
function firstLine(html: string): string {
  const plain = html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return plain.slice(0, 80);
}

/** POST /api/me/notes/[id]/publish-blog → 把一則筆記公開成部落格文章（同一份內容、不用複製）。 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 讀自己的筆記
  const { data: note } = await supabase.from("notes").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!note) return NextResponse.json({ error: "not_found", message: "找不到這則筆記" }, { status: 404 });

  const content = (note as any).content ?? "";
  const title = ((note as any).title?.trim() || firstLine(content) || "我的筆記").slice(0, 200);
  const tags: string[] = Array.isArray((note as any).tags) ? (note as any).tags.slice(0, 20) : [];
  const category = (note as any).category ?? null;

  // slug 去重（同 blog 一致）
  const base = slugify(title) || "note";
  let slug = base, n = 1;
  while (true) {
    const { data: exists } = await supabase.from("user_blog_articles").select("id").eq("user_id", user.id).eq("slug", slug).maybeSingle();
    if (!exists) break;
    slug = `${base}-${++n}`;
  }

  const { data: article, error } = await supabase.from("user_blog_articles").insert({
    user_id: user.id, title, slug,
    content: sanitizeRichHtmlStrict(content),
    tags, category, is_public: true,
    // 帶入筆記的課程關聯（有的話）→ 文章頁可點跳該章/該節（準確、不用猜）
    chapter_id: (note as any).chapter_id ?? null,
    lesson_id: (note as any).lesson_id ?? null,
  }).select("id, slug").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 確保有 blog_settings、順手把筆記標成公開
  await supabase.from("user_blog_settings").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  await supabase.from("notes").update({ is_public: true }).eq("id", id).eq("user_id", user.id);

  // 網址：優先自訂 blog_slug，否則 username
  const [{ data: settings }, { data: prof }] = await Promise.all([
    supabase.from("user_blog_settings").select("blog_slug").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);
  const userSlug = (settings as any)?.blog_slug || (prof as any)?.username || user.id;
  return NextResponse.json({ article, url: `/blogs/${userSlug}/${(article as any).slug}` });
}
