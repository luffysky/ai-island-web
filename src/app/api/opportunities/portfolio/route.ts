import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 機會島 §3.5/§3.1 —— 使用者作品 / 能力庫（user_portfolio）。
// 結構化存「我有什麼」（作品/技能/獎項/經歷）→ 供「AI 幫我挑」帶入、未來能力圖譜用。
const KINDS = new Set(["work", "skill", "award", "experience"]);

// GET — 我的作品庫
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("user_portfolio")
    .select("id, kind, title, description, url, tags, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

// POST { kind, title, description?, url?, tags? } — 新增
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const title = String(b.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "missing_title" }, { status: 400 });
  const kind = KINDS.has(b.kind) ? b.kind : "work";
  const tags = Array.isArray(b.tags) ? b.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 12) : [];
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("user_portfolio").insert({
    user_id: user.id, kind, title: title.slice(0, 160),
    description: (b.description ? String(b.description).slice(0, 1000) : null),
    url: (b.url ? String(b.url).slice(0, 500) : null), tags,
  }).select("id, kind, title, description, url, tags, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

// PATCH { id, ...fields } — 更新
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const id = String(b.id ?? "");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.title === "string" && b.title.trim()) patch.title = b.title.trim().slice(0, 160);
  if (b.kind && KINDS.has(b.kind)) patch.kind = b.kind;
  if (b.description !== undefined) patch.description = b.description ? String(b.description).slice(0, 1000) : null;
  if (b.url !== undefined) patch.url = b.url ? String(b.url).slice(0, 500) : null;
  if (Array.isArray(b.tags)) patch.tags = b.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 12);
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("user_portfolio").update(patch).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?id=xxx
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("user_portfolio").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
