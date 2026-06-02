import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase";
import { slugify } from "@/lib/blog-types";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { parseBody } from "@/lib/validate";

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  slug: z.string().max(200).optional(),
  summary: z.string().max(1000).nullable().optional(),
  content: z.string().max(200_000).optional(),
  cover_image: z.string().max(2000).nullable().optional(),
  cover_image_position: z.string().max(50).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  category: z.string().max(100).nullable().optional(),
  is_public: z.boolean().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_desc: z.string().max(500).nullable().optional(),
  series_id: z.string().uuid().nullable().optional(),
  series_order: z.number().int().nullable().optional(),
});

// GET /api/blog/articles/[id] — 取單篇（編輯用、本人）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_blog_articles")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ article: data });
}

// PATCH /api/blog/articles/[id] — 更新文章
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, PatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, any>;
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  // 只更新有給的欄位
  for (const f of ["title", "summary", "content", "cover_image", "cover_image_position",
                    "tags", "category", "is_public", "seo_title", "seo_desc",
                    "series_id", "series_order"]) {
    if (f in body) patch[f] = f === "content" ? sanitizeRichHtmlStrict(body[f]) : body[f];
  }

  // 若改 slug、檢查撞名
  if (body.slug) {
    const baseSlug = slugify(body.slug);
    let slug = baseSlug;
    let n = 1;
    while (true) {
      const { data: exists } = await supabase
        .from("user_blog_articles")
        .select("id")
        .eq("user_id", user.id)
        .eq("slug", slug)
        .neq("id", id)
        .maybeSingle();
      if (!exists) break;
      slug = `${baseSlug}-${++n}`;
    }
    patch.slug = slug;
  }

  const { data, error } = await supabase
    .from("user_blog_articles")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ article: data });
}

// DELETE /api/blog/articles/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("user_blog_articles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
