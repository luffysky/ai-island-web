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
  if (!body.subject || !body.body_html) return NextResponse.json({ error: "subject_body_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("email_campaigns").insert({
    subject: body.subject,
    body_html: body.body_html,
    segment_id: body.segment_id ?? null,
    status: body.status ?? "draft",
    scheduled_at: body.scheduled_at ?? null,
    created_by: a.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
