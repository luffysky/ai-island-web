import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseServer } from "@/lib/supabase-server";
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
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of ["version", "title", "body_md", "tags", "published"]) {
    if (key in body) patch[key] = body[key];
  }
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("changelog_entries").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await assertAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("changelog_entries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
