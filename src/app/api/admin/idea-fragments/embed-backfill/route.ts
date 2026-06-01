import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { embedFragmentRow } from "@/lib/idea-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  return p?.role === "admin" || (p as any)?.is_owner === true;
}

/** POST → 幫所有「還沒有 embedding」的碎片補算向量。回 { done, failed, total } */
export async function POST() {
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createSupabaseAdmin();
  const { data: rows } = await admin
    .from("idea_fragments")
    .select("id, title, content, tags, mood, category")
    .is("embedding", null)
    .limit(500);

  const list = (rows as any[]) ?? [];
  if (list.length === 0) return NextResponse.json({ ok: true, done: 0, total: 0, message: "全部都已建好向量" });

  let done = 0, failed = 0;
  for (const f of list) {
    const ok = await embedFragmentRow(f.id, f);
    ok ? done++ : failed++;
  }
  return NextResponse.json({ ok: true, done, failed, total: list.length });
}
