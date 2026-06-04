import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`island:sleep:${user.id}`, 3, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const reason = `island_sleep:${today}`;

  const admin = createSupabaseAdmin();

  // 一日一次（用 zcoin_ledger reason 鎖、即使睡覺只加 heart 不加 coin）
  try {
    const { data: existing } = await admin
      .from("coin_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("reason", reason)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: "already_slept" }, { status: 409 });
  } catch {}

  // 加 1 heart（max 5）
  const { data: prof } = await admin.from("profiles").select("hearts").eq("id", user.id).single();
  const cur = (prof as any)?.hearts ?? 5;
  const next = Math.min(5, cur + 1);
  if (next > cur) {
    await admin.from("profiles").update({ hearts: next }).eq("id", user.id);
  }

  // 寫一筆 0 amount ledger 作為 dedupe 標記
  try {
    await admin.from("coin_transactions").insert({ user_id: user.id, amount: 0, reason, balance_after: 0 });
  } catch {}

  return NextResponse.json({ ok: true, hearts: next });
}
