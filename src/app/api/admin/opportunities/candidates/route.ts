import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET ?status=pending — 待審候選清單
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const status = new URL(req.url).searchParams.get("status") || "pending";
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("opportunity_candidates")
    .select("id, source_id, source_name, raw_title, raw_url, raw_summary, raw_published_at, status, opportunity_id, created_at")
    .eq("status", status).order("created_at", { ascending: false }).limit(200);
  return NextResponse.json({ candidates: data ?? [] });
}

// POST — 審核 { id, action: "approve"|"reject", overrides?:{ name, category, prize_text, application_deadline, is_free } }
// approve = 用（可覆寫的）欄位 insert 進 opportunities（source_confidence 預設 unverified）+ 把候選標 approved 連過去。
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const b = await req.json().catch(() => ({} as any));
  const id = String(b.id ?? "");
  const action = b.action === "approve" ? "approve" : b.action === "reject" ? "reject" : null;
  if (!id || !action) return NextResponse.json({ error: "缺 id 或 action(approve|reject)" }, { status: 400 });
  const admin = createSupabaseAdmin();

  const { data: cand } = await admin.from("opportunity_candidates").select("*").eq("id", id).maybeSingle();
  if (!cand) return NextResponse.json({ error: "找不到候選" }, { status: 404 });
  if (cand.status !== "pending") return NextResponse.json({ error: "這筆已審過" }, { status: 400 });

  if (action === "reject") {
    await admin.from("opportunity_candidates").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // approve：insert 進 opportunities（人工核准＝可信但仍標 unverified 供二次核對）
  const ov = b.overrides ?? {};
  const insert: Record<string, any> = {
    type: "competition",
    name: String(ov.name ?? cand.raw_title).slice(0, 300),
    organizer: ov.organizer ? String(ov.organizer).slice(0, 120) : null,
    official_url: cand.raw_url || null,
    description: (ov.description ?? cand.raw_summary ?? null),
    category: ov.category ? String(ov.category).slice(0, 40) : null,
    prize_text: ov.prize_text ? String(ov.prize_text).slice(0, 200) : null,
    application_deadline: (typeof ov.application_deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ov.application_deadline)) ? ov.application_deadline : null,
    is_free: typeof ov.is_free === "boolean" ? ov.is_free : true,
    status: "open",
    source_confidence: "unverified",
  };
  const { data: opp, error } = await admin.from("opportunities").insert(insert).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("opportunity_candidates")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), opportunity_id: opp.id }).eq("id", id);
  return NextResponse.json({ ok: true, status: "approved", opportunityId: opp.id });
}
