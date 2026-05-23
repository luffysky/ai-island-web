import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// 跟 island-bus.RESOURCE_META 對齊（不從 client 拿、避免被改）
const REWARD: Record<string, number> = { wood: 1, crystal: 5, shell: 1 };
const MAX_PER_REDEEM = 200; // 一次最多 200 個防刷

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // rate limit：每分鐘 10 次（防快速重複）
  const rl = rateLimit(`island:redeem:${user.id}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const wood = Math.max(0, Math.min(MAX_PER_REDEEM, Number(body.wood ?? 0) | 0));
  const crystal = Math.max(0, Math.min(MAX_PER_REDEEM, Number(body.crystal ?? 0) | 0));
  const shell = Math.max(0, Math.min(MAX_PER_REDEEM, Number(body.shell ?? 0) | 0));

  const coins =
    wood * REWARD.wood +
    crystal * REWARD.crystal +
    shell * REWARD.shell;

  if (coins <= 0) return NextResponse.json({ error: "empty" }, { status: 400 });

  const admin = createSupabaseAdmin();

  // 加 z 幣 — 優先用 grant_zcoin RPC、若無就 fallback profiles.update
  try {
    const { error } = await admin.rpc("grant_zcoin", {
      p_user_id: user.id,
      p_amount: coins,
      p_reason: `island_harvest_wood${wood}_crystal${crystal}_shell${shell}`,
    });
    if (error) throw error;
  } catch {
    // fallback：直接 update profiles.z_coin
    const { data: prof } = await admin.from("profiles").select("z_coin").eq("id", user.id).single();
    const newCoin = (prof?.z_coin ?? 0) + coins;
    await admin.from("profiles").update({ z_coin: newCoin }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true, coins });
}
