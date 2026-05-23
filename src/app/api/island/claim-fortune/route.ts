import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Tier = "大吉" | "吉" | "平" | "凶" | "大凶";
type Fortune = {
  tier: Tier;
  reward: number;
  rewardKind: "coin" | "bond" | "crystal";
  emoji: string;
  message: string;
};

function rollServerFortune(): Fortune {
  const r = Math.random();
  if (r < 0.1) return { tier: "大吉", reward: 50, rewardKind: "coin", emoji: "🎊", message: "今日天運在你、放手去做！" };
  if (r < 0.4) return { tier: "吉", reward: 20, rewardKind: "coin", emoji: "🎁", message: "穩穩走、就是穩穩贏" };
  if (r < 0.7) return { tier: "平", reward: 5, rewardKind: "coin", emoji: "🍀", message: "平凡的日子也很美" };
  if (r < 0.9) return { tier: "凶", reward: 5, rewardKind: "bond", emoji: "🌧️", message: "今天累了、跟寵物說說話吧（+5 親密度安慰）" };
  return { tier: "大凶", reward: 1, rewardKind: "crystal", emoji: "🆘", message: "上天給你一顆水晶當補償（+1 水晶）" };
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`island:fortune:${user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const date = String(body.date ?? "");
  // 嚴格日期格式 + 必須是今天（台北日）
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  if (date !== today) return NextResponse.json({ error: "date_not_today" }, { status: 400 });

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

  // server 決定 tier
  const fortune = rollServerFortune();

  // 發 z 幣（只 coin tier 進 ledger、其他用 reason 區分但不發 coin）
  if (fortune.rewardKind === "coin") {
    try {
      const { error } = await admin.rpc("grant_zcoin", {
        p_user_id: user.id,
        p_amount: fortune.reward,
        p_reason: reason,
      });
      if (error) throw error;
    } catch {
      const { data: prof } = await admin.from("profiles").select("z_coin").eq("id", user.id).single();
      await admin.from("profiles").update({ z_coin: (prof?.z_coin ?? 0) + fortune.reward }).eq("id", user.id);
    }
  } else {
    // 非 coin tier 寫一筆 0 amount ledger 作為 dedupe 標記
    try {
      await admin.from("zcoin_ledger").insert({ user_id: user.id, amount: 0, reason, balance_after: 0 });
    } catch {}
  }

  return NextResponse.json({ ok: true, fortune });
}
