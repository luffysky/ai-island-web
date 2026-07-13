import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PER_USER = 10;

function labelOf(b: { keywords?: string; categories?: string[]; free_only?: boolean; min_prize?: number }): string {
  const parts: string[] = [];
  if (b.keywords) parts.push(`「${b.keywords}」`);
  if (b.categories?.length) parts.push(b.categories.join("/"));
  if (b.free_only) parts.push("免費");
  if (b.min_prize) parts.push(`獎金≥${b.min_prize}`);
  return parts.join(" · ") || "所有新機會";
}

// GET — 我的訂閱清單
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("opportunity_subscriptions")
    .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ subscriptions: data ?? [] });
}

// POST — 新增訂閱
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const admin = createSupabaseAdmin();

  const { count } = await admin.from("opportunity_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_PER_USER) return NextResponse.json({ error: `訂閱數已達上限（${MAX_PER_USER}）` }, { status: 400 });

  const keywords = String(b.keywords ?? "").trim().slice(0, 60) || null;
  const categories = Array.isArray(b.categories) ? b.categories.map((x: any) => String(x).slice(0, 40)).slice(0, 12) : [];
  const free_only = !!b.free_only;
  const min_prize = b.min_prize != null && !Number.isNaN(Number(b.min_prize)) ? Number(b.min_prize) : null;
  if (!keywords && categories.length === 0 && !free_only && min_prize == null) {
    return NextResponse.json({ error: "至少設一個條件（關鍵字/分類/免費/最低獎金）" }, { status: 400 });
  }
  const label = labelOf({ keywords: keywords ?? undefined, categories, free_only, min_prize: min_prize ?? undefined });

  const { data, error } = await admin.from("opportunity_subscriptions")
    .insert({ user_id: user.id, label, keywords, categories, free_only, min_prize })
    .select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscription: data });
}

// DELETE ?id=
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("opportunity_subscriptions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
