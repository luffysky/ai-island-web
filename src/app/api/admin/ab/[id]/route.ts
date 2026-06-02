import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.status === 401 ? ("unauthorized" as const) : ("forbidden" as const), status: gate.status };
  return { ok: true as const };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await assertAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const patch: Record<string, any> = {};
  for (const k of ["description", "status", "variants", "goal_event", "allocation"]) {
    if (k in body) patch[k] = body[k];
  }
  if ("allocation" in patch && !["weighted", "thompson"].includes(patch.allocation)) {
    return NextResponse.json({ error: "invalid_allocation" }, { status: 400 });
  }
  if (patch.status === "running" && !("started_at" in patch)) patch.started_at = new Date().toISOString();
  if (patch.status === "completed" && !("ended_at" in patch)) patch.ended_at = new Date().toISOString();

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ab_experiments").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await assertAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ab_experiments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
