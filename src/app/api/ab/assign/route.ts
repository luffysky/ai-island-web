import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { thompsonPick, type ArmStats } from "@/lib/thompson";

export const dynamic = "force-dynamic";

function pickVariantWeighted(variants: Array<{ key: string; weight: number }>): string {
  const total = variants.reduce((s, v) => s + (v.weight || 0), 0) || 1;
  let r = Math.random() * total;
  for (const v of variants) {
    r -= v.weight || 0;
    if (r <= 0) return v.key;
  }
  return variants[0]?.key ?? "control";
}

async function pickVariantThompson(
  admin: ReturnType<typeof createSupabaseAdmin>,
  experimentId: string,
  variants: Array<{ key: string; weight: number }>,
): Promise<string> {
  // 聚合每個 variant 的 assigned / converted
  const [{ data: assignedRows }, { data: convRows }] = await Promise.all([
    admin.from("ab_assignments").select("variant_key").eq("experiment_id", experimentId),
    admin.from("ab_events").select("variant_key").eq("experiment_id", experimentId).eq("event", "conversion"),
  ] as any);

  const assignedMap = new Map<string, number>();
  for (const r of (assignedRows as any[]) ?? []) {
    assignedMap.set(r.variant_key, (assignedMap.get(r.variant_key) ?? 0) + 1);
  }
  const convMap = new Map<string, number>();
  for (const r of (convRows as any[]) ?? []) {
    convMap.set(r.variant_key, (convMap.get(r.variant_key) ?? 0) + 1);
  }
  const arms: ArmStats[] = variants.map((v) => ({
    key: v.key,
    assigned: assignedMap.get(v.key) ?? 0,
    converted: convMap.get(v.key) ?? 0,
  }));
  const decision = thompsonPick(arms);
  return decision.picked || variants[0]?.key || "control";
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
    .select("id, status, variants, allocation")
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
    // 依 experiment.allocation 決定演算法（thompson 自動探索/利用、weighted 固定 weight）
    const allocation = (exp as any).allocation ?? "weighted";
    if (allocation === "thompson") {
      assignedVariant = await pickVariantThompson(admin, (exp as any).id, exp.variants as any);
    } else {
      assignedVariant = pickVariantWeighted(exp.variants as any);
    }
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
