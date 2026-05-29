import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function genApiKey(): { plain: string; prefix: string; hash: string } {
  // aii_XXXXXXXXXXXXX...（隨機 32 char base62）
  const rand = crypto.randomBytes(24).toString("base64").replace(/[+/=]/g, "").slice(0, 32);
  const plain = `aii_${rand}`;
  const prefix = plain.slice(0, 12); // 給 user 看「aii_XXXXXXXX」識別
  const hash = crypto.createHash("sha256").update(plain).digest("hex");
  return { plain, prefix, hash };
}

/** GET — 列我的 keys（不回 plain key、只回 prefix / 用量） */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("api_keys_v1")
    .select("id, name, key_prefix, quota_per_month, used_this_month, last_used_at, active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

/** POST { name } — 生新 key、回 plain（只此一次、之後拿不到） */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const name = String(body.name ?? "").trim().slice(0, 50) || "Untitled Key";

  // 每 user 最多 5 把 key
  const admin = createSupabaseAdmin();
  const { count } = await admin.from("api_keys_v1").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("active", true);
  if ((count ?? 0) >= 5) return NextResponse.json({ error: "已達 5 把 key 上限、停用一把再生新的" }, { status: 400 });

  const { plain, prefix, hash } = genApiKey();
  const { error } = await admin.from("api_keys_v1").insert({
    user_id: user.id, name,
    key_prefix: prefix,
    key_hash: hash,
    quota_per_month: 100,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ⚠️ plain key 只此一次顯示、之後不可拿回
  return NextResponse.json({ ok: true, key: plain, prefix, name });
}

/** DELETE ?id=... — 停用 key */
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("api_keys_v1").update({ active: false }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
