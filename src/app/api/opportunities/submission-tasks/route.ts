import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 機會島 §3.5/§3.6 —— 每個機會的「缺件 / 準備清單」逐項追蹤（submission_tasks）。
// 本人 only（RLS 已保護；此處也用 user_id 過濾雙保險）。

// GET /api/opportunities/submission-tasks[?opportunityId=xxx] — 我的所有（或單機會）待辦
export async function GET(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ tasks: [] });
  const oppId = new URL(req.url).searchParams.get("opportunityId");
  const admin = createSupabaseAdmin();
  let q = admin.from("submission_tasks")
    .select("id, opportunity_id, title, done, due_date, sort_index, created_at")
    .eq("user_id", user.id)
    .order("sort_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (oppId) q = q.eq("opportunity_id", oppId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

// POST { opportunityId, title, dueDate? } — 新增一項；或 { opportunityId, titles:[] } 批次帶入建議缺件
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const opportunityId = String(b.opportunityId ?? "");
  if (!opportunityId) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();

  const titles: string[] = Array.isArray(b.titles)
    ? b.titles.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 20)
    : [String(b.title ?? "").trim()].filter(Boolean);
  if (titles.length === 0) return NextResponse.json({ error: "empty" }, { status: 400 });

  // 取目前最大 sort_index、往後接
  const { data: last } = await admin.from("submission_tasks")
    .select("sort_index").eq("user_id", user.id).eq("opportunity_id", opportunityId)
    .order("sort_index", { ascending: false }).limit(1);
  let sort = (last?.[0]?.sort_index ?? -1) + 1;

  const rows = titles.map((title) => ({
    user_id: user.id, opportunity_id: opportunityId, title: title.slice(0, 200),
    due_date: b.dueDate || null, sort_index: sort++,
  }));
  const { data, error } = await admin.from("submission_tasks").insert(rows)
    .select("id, opportunity_id, title, done, due_date, sort_index, created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

// PATCH { id, done?, title?, dueDate? } — 更新一項
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const id = String(b.id ?? "");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.done === "boolean") patch.done = b.done;
  if (typeof b.title === "string" && b.title.trim()) patch.title = b.title.trim().slice(0, 200);
  if (b.dueDate !== undefined) patch.due_date = b.dueDate || null;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("submission_tasks").update(patch)
    .eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?id=xxx — 刪一項
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("submission_tasks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
