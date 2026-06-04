import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// 跟 island-bus.ACHIEVEMENTS 的 reward 對齊（server-side 不從 client 拿）
const REWARD: Record<string, number> = {
  first_step: 10, tree_lover: 50, crystal_hunter: 80, shell_collector: 50,
  marathon: 100, talker: 60, rich: 80, treasure_hunter: 200,
  night_owl: 50, storm_walker: 50,
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`island:ach:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const id = String(body.achievement_id ?? "");
  const reward = REWARD[id];
  if (!reward) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const reason = `island_ach:${id}`;

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
