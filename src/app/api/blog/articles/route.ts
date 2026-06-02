import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase";
import { slugify } from "@/lib/blog-types";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { parseBody } from "@/lib/validate";

const ArticleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().max(200).optional(),
  summary: z.string().max(1000).nullable().optional(),
  content: z.string().max(200_000).optional().default(""),
  cover_image: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  category: z.string().max(100).nullable().optional(),
  is_public: z.boolean().optional().default(false),
  seo_title: z.string().max(200).nullable().optional(),
  seo_desc: z.string().max(500).nullable().optional(),
  series_id: z.string().uuid().nullable().optional(),
  series_order: z.number().int().nullable().optional(),
});

// GET /api/blog/articles — 取自己的文章列表
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_blog_articles")
    .select("id, title, slug, summary, cover_image, tags, category, is_public, view_count, series_id, published_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data });
}

// POST /api/blog/articles — 建立新文章
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, ArticleSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const title = body.title.trim();

  // slug：用給的或從標題產生、撞名加數字
  const baseSlug = body.slug ? slugify(body.slug) : slugify(title);
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const { data: exists } = await supabase
      .from("user_blog_articles")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!exists) break;
    slug = `${baseSlug}-${++n}`;
  }

  const { data, error } = await supabase
    .from("user_blog_articles")
    .insert({
      user_id: user.id,
      title,
      slug,
      summary: body.summary ?? null,
      content: sanitizeRichHtmlStrict(body.content),
      cover_image: body.cover_image ?? null,
      tags: body.tags ?? [],
      category: body.category ?? null,
      is_public: body.is_public ?? false,   // 預設草稿
      seo_title: body.seo_title ?? null,
      seo_desc: body.seo_desc ?? null,
      series_id: body.series_id ?? null,
      series_order: body.series_order ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 確保使用者有 blog_settings（沒有就建一個）
  await supabase
    .from("user_blog_settings")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  return NextResponse.json({ article: data });
}
