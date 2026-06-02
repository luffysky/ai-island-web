import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.status === 401 ? ("unauthorized" as const) : ("forbidden" as const), status: gate.status };
  return { ok: true as const, userId: gate.userId };
}

export async function POST(req: NextRequest) {
  const a = await assertAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => ({} as any));
  if (!body.kind || !body.key) return NextResponse.json({ error: "kind_key_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("gamification_rules").insert({
    kind: body.kind,
    key: body.key,
    value: body.value ?? {},
    note: body.note ?? null,
    enabled: body.enabled !== false,
    updated_by: a.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
