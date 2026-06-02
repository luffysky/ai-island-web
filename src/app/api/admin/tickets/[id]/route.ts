import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff(["admin", "teacher", "assistant"]);
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const patch: Record<string, any> = {};
  for (const k of ["status", "priority", "category", "assigned_to"]) {
    if (k in body) patch[k] = body[k];
  }
  if (patch.status === "resolved" || patch.status === "closed") {
    patch.resolved_at = new Date().toISOString();
  }
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("tickets").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
