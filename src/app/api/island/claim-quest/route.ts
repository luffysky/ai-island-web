import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// 跟 island-bus.TODAY_QUESTS 對齊（不從 client 拿、避免被改 reward）
const REWARD: Record<string, number> = { wood: 30, crystal: 30, shell: 20, steps: 20 };

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // rate limit：每分鐘 20 次
  const rl = rateLimit(`island:claim:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const questId = String(body.quest_id ?? "");
  const date = String(body.date ?? "");
  // 嚴格 YYYY-MM-DD（防止 reason 偽造繞 dedupe）
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  const reward = REWARD[questId];
  if (!reward) return NextResponse.json({ error: "invalid_quest" }, { status: 400 });

  const admin = createSupabaseAdmin();

  // 同一天同一任務只能領一次 — 用 zcoin_ledger reason 唯一性檢查（簡單版）
  const reason = `island_quest:${date}:${questId}`;
  try {
    const { data: existing } = await admin
      .from("zcoin_ledger")
      .select("id")
      .eq("user_id", user.id)
      .eq("reason", reason)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  } catch {
    // 表沒有 reason 欄就跳過 dedupe
  }

  // 發 z 幣
  try {
    const { error } = await admin.rpc("grant_zcoin", {
      p_user_id: user.id,
      p_amount: reward,
      p_reason: reason,
    });
    if (error) throw error;
  } catch {
    const { data: prof } = await admin.from("profiles").select("z_coin").eq("id", user.id).single();
    const newCoin = (prof?.z_coin ?? 0) + reward;
    await admin.from("profiles").update({ z_coin: newCoin }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true, reward });
}
