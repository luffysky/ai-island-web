import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { resolveArticle } from "@/lib/blog-resolve";
import type { BlogComment } from "@/lib/blog-types";

// GET — 取文章的留言（巢狀組好）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userSlug: string; articleSlug: string }> }
) {
  const { userSlug, articleSlug } = await params;
  const res = await resolveArticle(userSlug, articleSlug);
  if (!res) return NextResponse.json({ comments: [] });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("blog_comments")
    .select("*")
    .eq("article_id", res.article.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: true });

  // 組巢狀：parent_id 為 null 的是頂層、其餘掛在 replies
  const all = (data ?? []) as BlogComment[];
  const topLevel: BlogComment[] = [];
  const byId: Record<string, BlogComment> = {};
  all.forEach((c) => { byId[c.id] = { ...c, replies: [] }; });
  all.forEach((c) => {
    if (c.parent_id && byId[c.parent_id]) {
      byId[c.parent_id].replies!.push(byId[c.id]);
    } else {
      topLevel.push(byId[c.id]);
    }
  });

  return NextResponse.json({ comments: topLevel });
}

// POST — 新增留言（登入者帶身分、訪客匿名）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userSlug: string; articleSlug: string }> }
) {
  const { userSlug, articleSlug } = await params;
  const res = await resolveArticle(userSlug, articleSlug);
  if (!res) return NextResponse.json({ error: "article_not_found" }, { status: 404 });

  const body = await req.json();
  const content = (body.content ?? "").trim();
  if (!content || content.length > 1000) {
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let authorName = (body.author_name ?? "匿名訪客").slice(0, 40);
  let authorAvatar: string | null = null;

  // 登入者用帳號身分
  if (user) {
    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .single();
    if (profile) {
      authorName = profile.display_name || profile.username || "用戶";
      authorAvatar = profile.avatar_url;
    }
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("blog_comments")
    .insert({
      article_id: res.article.id,
      parent_id: body.parent_id ?? null,
      user_id: user?.id ?? null,
      author_name: authorName,
      author_email: body.author_email ?? null,
      author_avatar: authorAvatar,
      content,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: { ...data, replies: [] } });
}

// DELETE — 刪自己的留言（?id=xxx）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userSlug: string; articleSlug: string }> }
) {
  await params;
  const commentId = req.nextUrl.searchParams.get("id");
  if (!commentId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 只能刪自己的
  const { error } = await supabase
    .from("blog_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
