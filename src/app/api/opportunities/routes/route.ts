import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/opportunities/routes — 我的航線（收藏 + 投件進度）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ routes: [] });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("opportunity_routes")
    .select("id, opportunity_id, stage, note, created_at, opportunity:opportunities(id, name, category, organizer, prize_text, application_deadline, status, official_url, requires_demo, requires_pitch, requires_video, requires_business_plan, requires_team, requires_student, requires_company)")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ routes: data ?? [] });
}

// POST /api/opportunities/routes { opportunityId, stage?, note? } — 加入/更新航線
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const opportunityId = String(b.opportunityId ?? "");
  if (!opportunityId) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const stage = ["saved", "preparing", "submitted", "done"].includes(b.stage) ? b.stage : "saved";
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("opportunity_routes").upsert(
    { user_id: user.id, opportunity_id: opportunityId, stage, note: b.note ?? null },
    { onConflict: "user_id,opportunity_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/opportunities/routes?id=xxx — 從航線移除（opportunityId）
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const opportunityId = new URL(req.url).searchParams.get("id");
  if (!opportunityId) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("opportunity_routes")
    .delete().eq("user_id", user.id).eq("opportunity_id", opportunityId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
