import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

const ALLOWED = [
  "incident_type",
  "severity",
  "affected_user_count",
  "affected_data_types",
  "description",
  "root_cause",
  "containment_actions",
  "remediation_plan",
  "status",
  "reported_to_authority",
  "authority_reported_at",
  "authority_reference",
  "users_notified",
  "users_notified_at",
  "notification_method",
  "resolved_at",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json();
  const patch: Record<string, any> = {};
  for (const k of ALLOWED) {
    if (k in body) patch[k] = body[k];
  }
  patch.updated_at = new Date().toISOString();

  const admin = createSupabaseAdmin();

  const { data: before } = await admin
    .from("breach_incidents")
    .select("status, reported_to_authority")
    .eq("id", id)
    .single();

  const { data, error } = await admin
    .from("breach_incidents")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "breach.updated",
    target_type: "breach_incident",
    target_id: String(id),
    changes: {
      before,
      patch,
    },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true, incident: data });
}
