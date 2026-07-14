import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { resolveArticle } from "@/lib/blog-resolve";
import type { BlogComment } from "@/lib/blog-types";
import { parseBody } from "@/lib/validate";
import { notifyMention } from "@/lib/notify-helpers";

// 從內容抽出 @提及 token 的 user id（去重）
function parseMentionIds(content: string): string[] {
  const ids = new Set<string>();
  const re = /\[\[user:([0-9a-fA-F-]{36})\|[^\]]*\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) ids.add(m[1]);
  return [...ids];
}

const CommentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  author_name: z.string().max(40).optional(),
  author_email: z.string().email().max(200).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

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

  const parsed = await parseBody(req, CommentSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const content = body.content.trim();

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

  // @ 提及通知：通知被 tag 的人（排除自己；訪客留言 user?.id 為 null）
  const mentioned = parseMentionIds(content).filter((uid) => uid !== user?.id);
  const preview = content.replace(/\[\[user:[0-9a-fA-F-]{36}\|([^\]]*)\]\]/g, "@$1");
  for (const uid of mentioned.slice(0, 10)) {
    notifyMention({ userId: uid, mentionerName: authorName, where: "部落格留言", preview, link: `/blogs/${userSlug}/${articleSlug}` }).catch(() => {});
  }

  return NextResponse.json({ comment: { ...data, replies: [] } });
}

// PATCH — 編輯自己的留言（?id=xxx，body.content）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userSlug: string; articleSlug: string }> }
) {
  await params;
  const commentId = req.nextUrl.searchParams.get("id");
  if (!commentId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim();
  if (!content || content.length > 1000) {
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });
  }

  const updated_at = new Date().toISOString();
  // 只能編輯自己的：service role 繞過 RLS、用 user_id 過濾強制本人限定
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("blog_comments")
    .update({ content, updated_at })
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, content, updated_at });
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
