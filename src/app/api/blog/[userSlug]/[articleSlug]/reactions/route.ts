import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { resolveArticle } from "@/lib/blog-resolve";

const ALLOWED_EMOJIS = ["❤️", "🔥", "👏", "😮", "😂", "🎉"];

// GET — 取文章各 emoji 的數量
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userSlug: string; articleSlug: string }> }
) {
  const { userSlug, articleSlug } = await params;
  const res = await resolveArticle(userSlug, articleSlug);
  if (!res) return NextResponse.json({ reactions: {} });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("blog_reactions")
    .select("emoji")
    .eq("article_id", res.article.id);

  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  });
  return NextResponse.json({ reactions: counts });
}

// POST — 切換一個 emoji 反應（同 fingerprint 已按過 → 取消、否則新增）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userSlug: string; articleSlug: string }> }
) {
  const { userSlug, articleSlug } = await params;
  const res = await resolveArticle(userSlug, articleSlug);
  if (!res) return NextResponse.json({ error: "article_not_found" }, { status: 404 });

  const body = await req.json();
  const emoji = body.emoji ?? "❤️";
  const fp = (body.fingerprint ?? "").slice(0, 64);
  if (!ALLOWED_EMOJIS.includes(emoji) || !fp) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 已按過？
  const { data: existing } = await admin
    .from("blog_reactions")
    .select("id")
    .eq("article_id", res.article.id)
    .eq("fingerprint", fp)
    .eq("emoji", emoji)
    .maybeSingle();

  let active: boolean;
  if (existing) {
    await admin.from("blog_reactions").delete().eq("id", existing.id);
    active = false;
  } else {
    await admin.from("blog_reactions").insert({
      article_id: res.article.id,
      fingerprint: fp,
      emoji,
    });
    active = true;
  }

  return NextResponse.json({ ok: true, emoji, active });
}
