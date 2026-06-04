import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CHEST_REWARD: Record<number, number> = {
  901: 30, 902: 30, 903: 50, 904: 50, 905: 100,
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`island:chest:${user.id}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const chestId = Number(body.chest_id);
  const reward = CHEST_REWARD[chestId];
  if (!reward) return NextResponse.json({ error: "invalid_chest" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const reason = `island_chest:${chestId}`;

  // 一帳一寶箱只能領一次
  try {
    const { data: existing } = await admin
      .from("coin_transactions")
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
