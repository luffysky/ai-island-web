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
