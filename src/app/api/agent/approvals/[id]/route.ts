import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/agent/approvals/[id] { decision:"approved"|"denied" }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const decision = body.decision === "approved" ? "approved" : body.decision === "denied" ? "denied" : null;
  if (!decision) return NextResponse.json({ error: "decision 需為 approved|denied" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("agent_approvals")
    .update({ decision, decided_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id).eq("decision", "pending");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
