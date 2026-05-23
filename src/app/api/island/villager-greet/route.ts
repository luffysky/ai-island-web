import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const REWARDS: Record<string, number> = {
  bunny: 5, fox: 5, panda: 8, cat: 5, deer: 6, tiger: 8,
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`island:villager:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const vid = String(body.villager_id ?? "");
  const reward = REWARDS[vid];
  if (!reward) return NextResponse.json({ error: "invalid_villager" }, { status: 400 });

  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const reason = `island_villager:${today}:${vid}`;
  const admin = createSupabaseAdmin();

  try {
    const { data: existing } = await admin
      .from("zcoin_ledger")
      .select("id")
      .eq("user_id", user.id)
      .eq("reason", reason)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  } catch {}

  try {
    const { error } = await admin.rpc("grant_zcoin", { p_user_id: user.id, p_amount: reward, p_reason: reason });
    if (error) throw error;
  } catch {
    const { data: prof } = await admin.from("profiles").select("z_coin").eq("id", user.id).single();
    await admin.from("profiles").update({ z_coin: (prof?.z_coin ?? 0) + reward }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true, reward });
}
