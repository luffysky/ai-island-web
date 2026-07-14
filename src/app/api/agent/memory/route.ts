import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/memory — 分身長期記得關於我的事（透明可見）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_memory")
    .select("id, kind, key, value, updated_at")
    .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100);
  return NextResponse.json({ memory: data ?? [] });
}

// POST /api/agent/memory { key, value, kind? } — 使用者自己新增一條記憶
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const value = String(b.value ?? "").trim().slice(0, 500);
  if (!value) return NextResponse.json({ error: "記憶內容不能空" }, { status: 400 });
  const key = String(b.key ?? "").trim().slice(0, 60) || "備註";
  const kind = String(b.kind ?? "fact").trim().slice(0, 20) || "fact";
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("agent_memory")
    .insert({ user_id: user.id, kind, key, value }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

// PATCH /api/agent/memory?id=xxx { key?, value? } — 編輯一條記憶
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const b = await req.json().catch(() => ({} as any));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.key === "string") patch.key = b.key.trim().slice(0, 60);
  if (typeof b.value === "string") { const v = b.value.trim().slice(0, 500); if (!v) return NextResponse.json({ error: "內容不能空" }, { status: 400 }); patch.value = v; }
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("agent_memory").update(patch).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/agent/memory?id=xxx — 刪一條記憶（或 ?all=1 清空）
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const all = url.searchParams.get("all");
  let q = admin.from("agent_memory").delete().eq("user_id", user.id);
  if (all === "1") { /* 清空全部 */ }
  else if (id) q = q.eq("id", id);
  else return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
