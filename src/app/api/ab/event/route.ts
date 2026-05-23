import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// POST /api/ab/event { key, variant, event, meta? }
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await req.json().catch(() => ({} as any));
  if (!body.key || !body.variant || !body.event) {
    return NextResponse.json({ error: "key_variant_event_required" }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  const { data: exp } = await admin
    .from("ab_experiments")
    .select("id")
    .eq("key", body.key)
    .maybeSingle();
  if (!exp) return NextResponse.json({ ok: true, skipped: "no_experiment" });

  await admin.from("ab_events").insert({
    experiment_id: exp.id,
    variant_key: body.variant,
    event: body.event,
    user_id: user?.id ?? null,
    anon_id: typeof body.anonId === "string" ? body.anonId : null,
    meta: body.meta ?? null,
  });
  return NextResponse.json({ ok: true });
}
