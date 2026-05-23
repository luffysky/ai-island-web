import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const TIER_REWARD: Record<string, number> = {
  "大吉": 50,
  "吉":   20,
  "平":   5,
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`island:fortune:${user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const date = String(body.date ?? "");
  const tier = String(body.tier ?? "");
  const reward = TIER_REWARD[tier];
  if (!reward) return NextResponse.json({ error: "invalid_tier" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const reason = `island_fortune:${date}`;

  // 一天一次
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
    const { error } = await admin.rpc("grant_zcoin", {
      p_user_id: user.id,
      p_amount: reward,
      p_reason: reason,
    });
    if (error) throw error;
  } catch {
    const { data: prof } = await admin.from("profiles").select("z_coin").eq("id", user.id).single();
    await admin.from("profiles").update({ z_coin: (prof?.z_coin ?? 0) + reward }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true, reward });
}
