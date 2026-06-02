import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const action = body.action as "resolve" | "dismiss" | "escalate";
  if (!["resolve", "dismiss", "escalate"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const status = action === "resolve" ? "resolved" : action === "dismiss" ? "dismissed" : "escalated";

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("user_reports").update({
    status,
    resolution_note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
    resolved_by: gate.userId,
    resolved_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
