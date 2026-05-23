import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const FISH_REWARD: Record<string, number> = {
  minnow: 3, carp: 8, tuna: 15, golden: 30, dragon: 100,
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 一分鐘最多 12 次（5 秒一次）防刷
  const rl = rateLimit(`island:fish:${user.id}`, 12, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const fish = String(body.fish ?? "");
  const reward = FISH_REWARD[fish];
  if (!reward) return NextResponse.json({ error: "invalid_fish" }, { status: 400 });

  const admin = createSupabaseAdmin();
  try {
    const { error } = await admin.rpc("grant_zcoin", {
      p_user_id: user.id,
      p_amount: reward,
      p_reason: `island_fish:${fish}:${new Date().toISOString().slice(0, 10)}`,
    });
    if (error) throw error;
  } catch {
    const { data: prof } = await admin.from("profiles").select("z_coin").eq("id", user.id).single();
    await admin.from("profiles").update({ z_coin: (prof?.z_coin ?? 0) + reward }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true, reward });
}
