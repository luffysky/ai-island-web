import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOCIAL_PLATFORMS = [
  "line", "telegram", "discord", "facebook", "instagram", "threads", "x", "youtube", "tiktok", "xiaohongshu", "dcard",
] as const;
const PLATFORM_SET = new Set<string>(SOCIAL_PLATFORMS);

// GET /api/social/posts — 我的貼文（草稿/排程/已發布）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("social_posts")
    .select("id, content, media_urls, platforms, status, scheduled_at, published_at, source, note, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ posts: data ?? [] });
}

// POST /api/social/posts { content, platforms[], action: draft|schedule, scheduled_at?, source? }
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const content = String(b.content ?? "").trim().slice(0, 5000);
  const platforms = Array.isArray(b.platforms) ? b.platforms.filter((p: string) => PLATFORM_SET.has(p)).slice(0, 11) : [];
  if (!content && !(Array.isArray(b.media_urls) && b.media_urls.length)) return NextResponse.json({ error: "貼文內容不能空" }, { status: 400 });
  if (platforms.length === 0) return NextResponse.json({ error: "至少選一個平台" }, { status: 400 });

  const action = b.action === "schedule" ? "schedule" : "draft";
  const scheduledAt = action === "schedule" && b.scheduled_at ? new Date(b.scheduled_at).toISOString() : null;
  if (action === "schedule" && !scheduledAt) return NextResponse.json({ error: "排程要選時間" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("social_posts").insert({
    user_id: user.id,
    content,
    media_urls: Array.isArray(b.media_urls) ? b.media_urls.slice(0, 10) : [],
    platforms,
    status: action === "schedule" ? "scheduled" : "draft",
    scheduled_at: scheduledAt,
    source: b.source === "ai" ? "ai" : "me",
    // 誠實標註：實際送到各平台的 adapter 分階段接（LINE/TG/Discord 先），現在先存下來/排程。
    note: "尚未真正送出（各平台發送串接中；LINE/TG/Discord 會最先能真發）",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

// PATCH /api/social/posts?id= { content?, platforms?, status?, scheduled_at? }
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const b = await req.json().catch(() => ({} as any));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.content === "string") patch.content = b.content.slice(0, 5000);
  if (Array.isArray(b.platforms)) patch.platforms = b.platforms.filter((p: string) => PLATFORM_SET.has(p)).slice(0, 11);
  if (typeof b.status === "string" && ["draft", "scheduled", "published", "failed"].includes(b.status)) patch.status = b.status;
  if (b.scheduled_at !== undefined) patch.scheduled_at = b.scheduled_at ? new Date(b.scheduled_at).toISOString() : null;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("social_posts").update(patch).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/social/posts?id=
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("social_posts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
