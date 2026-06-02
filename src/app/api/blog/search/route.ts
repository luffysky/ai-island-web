import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

// GET /api/blog/search?q=關鍵字 — 跨部落格搜尋公開文章
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const admin = createSupabaseAdmin();

  // 用 full-text search（textSearch）配 search_vector 欄位
  // 多個字以空白切、用 & 連接成 tsquery
  const tsQuery = q.split(/\s+/).filter(Boolean).join(" & ");

  const { data: queried, error } = await admin
    .from("user_blog_articles")
    .select("id, title, slug, summary, cover_image, tags, category, view_count, published_at, user_id")
    .eq("is_public", true)
    .textSearch("search_vector", tsQuery, { config: "simple" })
    .order("published_at", { ascending: false })
    .limit(30);
  let data = queried;

  // textSearch 失敗時退回 ilike 模糊搜尋（標題）
  if (error) {
    const fallback = await admin
      .from("user_blog_articles")
      .select("id, title, slug, summary, cover_image, tags, category, view_count, published_at, user_id")
      .eq("is_public", true)
      .ilike("title", `%${q}%`)
      .order("published_at", { ascending: false })
      .limit(30);
    data = fallback.data;
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // 補上每篇文章的部落格 slug（給連結用）
  const userIds = [...new Set(data.map((a: any) => a.user_id))];
  const { data: blogs } = await admin
    .from("user_blog_settings")
    .select("user_id, blog_slug")
    .in("user_id", userIds);

  const slugMap: Record<string, string> = {};
  (blogs ?? []).forEach((b: any) => {
    slugMap[b.user_id] = b.blog_slug || b.user_id;
  });

  const results = data.map((a: any) => ({
    ...a,
    blog_slug: slugMap[a.user_id] || a.user_id,
  }));

  return NextResponse.json({ results });
}
