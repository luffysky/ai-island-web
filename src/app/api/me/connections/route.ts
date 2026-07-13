import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { encryptKey } from "@/lib/ai-crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 支援的平台（要更多就往這加）。目前皆手動連結、待各平台註冊 OAuth app。
const PROVIDERS = ["telegram", "discord", "youtube", "instagram", "threads", "tiktok", "facebook", "x", "github", "gmail", "gcalendar"] as const;
const PROVIDER_SET = new Set<string>(PROVIDERS);
const MAX_PER_USER = 50;

// GET — 我連結的帳號（不回 token，只回 provider/顯示名/狀態）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("user_connected_accounts")
    .select("id, provider, external_id, display_name, connect_method, status, created_at, access_token_encrypted")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  const connections = (data ?? []).map((c) => ({
    id: c.id, provider: c.provider, external_id: c.external_id, display_name: c.display_name,
    connect_method: c.connect_method, status: c.status, created_at: c.created_at,
    has_token: !!c.access_token_encrypted,
  }));
  return NextResponse.json({ connections });
}

// POST — 新增連結（手動：貼 handle + 選填 token）。多帳號：同平台可重複綁不同 external_id。
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const provider = String(b.provider ?? "");
  if (!PROVIDER_SET.has(provider)) return NextResponse.json({ error: "不支援的平台" }, { status: 400 });
  const displayName = String(b.display_name ?? "").trim().slice(0, 120);
  const externalId = String(b.external_id ?? b.display_name ?? "").trim().slice(0, 200) || null;
  if (!displayName) return NextResponse.json({ error: "請填帳號名稱 / @handle" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { count } = await admin.from("user_connected_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_PER_USER) return NextResponse.json({ error: `連結帳號數已達上限（${MAX_PER_USER}）` }, { status: 400 });

  const token = String(b.token ?? "").trim();
  const row: Record<string, any> = {
    user_id: user.id, provider, external_id: externalId, display_name: displayName,
    connect_method: "manual", status: "connected",
    access_token_encrypted: token ? encryptKey(token) : null,
    metadata: b.metadata && typeof b.metadata === "object" ? b.metadata : {},
  };
  const { data, error } = await admin.from("user_connected_accounts")
    .insert(row).select("id, provider, external_id, display_name, connect_method, status, created_at").single();
  if (error) {
    if (String(error.message).includes("uniq_uca_account")) return NextResponse.json({ error: "這個帳號已經連結過了" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ connection: { ...data, has_token: !!token } });
}

// DELETE ?id=
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("user_connected_accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
