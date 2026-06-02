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
  const status = String(body.status ?? "");
  if (!["pending", "dismissed", "escalated", "resolved"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ai_moderation_flags").update({
    status,
    resolved_at: status === "pending" ? null : new Date().toISOString(),
    resolved_by: status === "pending" ? null : gate.userId,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
