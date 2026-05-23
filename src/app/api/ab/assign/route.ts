import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function pickVariant(variants: Array<{ key: string; weight: number }>): string {
  const total = variants.reduce((s, v) => s + (v.weight || 0), 0) || 1;
  let r = Math.random() * total;
  for (const v of variants) {
    r -= v.weight || 0;
    if (r <= 0) return v.key;
  }
  return variants[0]?.key ?? "control";
}

// POST /api/ab/assign { key, anonId? } → { variant }
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await req.json().catch(() => ({} as any));
  const key = String(body.key ?? "");
  const anonId = typeof body.anonId === "string" ? body.anonId : null;
  if (!key) return NextResponse.json({ error: "key_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: exp } = await admin
    .from("ab_experiments")
    .select("id, status, variants")
    .eq("key", key)
    .eq("status", "running")
    .maybeSingle();
  if (!exp) return NextResponse.json({ variant: null, reason: "not_running" });

  // 取現有 assignment
  let assignedVariant: string | null = null;
  if (user) {
    const { data: existing } = await admin
      .from("ab_assignments")
      .select("variant_key")
      .eq("experiment_id", exp.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) assignedVariant = (existing as any).variant_key;
  } else if (anonId) {
    const { data: existing } = await admin
      .from("ab_assignments")
      .select("variant_key")
      .eq("experiment_id", exp.id)
      .eq("anon_id", anonId)
      .maybeSingle();
    if (existing) assignedVariant = (existing as any).variant_key;
  }

  if (!assignedVariant) {
    assignedVariant = pickVariant(exp.variants as any);
    await admin.from("ab_assignments").insert({
      experiment_id: exp.id,
      user_id: user?.id ?? null,
      anon_id: anonId,
      variant_key: assignedVariant,
    }).select().maybeSingle();
  }

  // 寫 exposure event（每次 assign 都寫、admin 看曝光量）
  await admin.from("ab_events").insert({
    experiment_id: exp.id,
    variant_key: assignedVariant,
    event: "exposure",
    user_id: user?.id ?? null,
    anon_id: anonId,
  });

  return NextResponse.json({ variant: assignedVariant });
}
