import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { castGua, buildGuaPrompt, parseGuaReading } from "@/lib/iching";
import { taipeiToday } from "@/lib/fortune-service";
import { getFortuneGate } from "@/lib/fortune-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { question? } → 梅花易數起卦（免費本地算）+ AI 深解。一事一卦、同人同日同問同卦。 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`fortune:iching:${user.id}`, 12, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", message: "慢一點，卦需要靜心。" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const question = String(body.question ?? "").trim().slice(0, 120);

  // 起卦（免費、本地、決定性：同人同日同問 → 同卦）— 不受付費限制、隨你問幾次
  const gua = castGua(`${user.id}|${taipeiToday()}`, question);

  // AI 深解＝付費點：免費每日 1 次、付費無限。用不到 AI 就不燒錢（省成本）。
  const gate = await getFortuneGate(user.id, "iching");
  let reading = null as null | { summary: string; advice: string };
  let locked = false;
  if (gate.aiAllowed) {
    try {
      const { system, user: userPrompt } = buildGuaPrompt(gua);
      const res = await completeForUsage("agent_core", { system, user: userPrompt, maxTokens: 500, temperature: 0.8 });
      reading = parseGuaReading(res.text);
    } catch { reading = null; }
    // 只在 AI 真的產出時記一筆（免費用戶今天的免費深解用掉；付費不記、永遠可再解）
    if (reading && !gate.paid) {
      await gate.admin.from("fortune_daily")
        .upsert({ user_id: user.id, date: gate.date, kind: "iching", payload: { gua, reading } }, { onConflict: "user_id,date,kind" })
        .then(() => {}, () => {});
    }
  } else {
    locked = true; // 免費用戶今天的 AI 深解用完了
  }

  return NextResponse.json({ gua, reading, locked, paid: gate.paid });
}
