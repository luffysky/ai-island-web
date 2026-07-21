import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { castGua, buildGuaPrompt, parseGuaReading } from "@/lib/iching";
import { taipeiToday } from "@/lib/fortune-service";

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

  // 起卦（免費、本地、決定性：同人同日同問 → 同卦）
  const gua = castGua(`${user.id}|${taipeiToday()}`, question);

  // AI 深解（隨需、便宜；失敗仍回免費簡卦意）
  let reading = null as null | { summary: string; advice: string };
  try {
    const { system, user: userPrompt } = buildGuaPrompt(gua);
    const res = await completeForUsage("agent_core", { system, user: userPrompt, maxTokens: 500, temperature: 0.8 });
    reading = parseGuaReading(res.text);
  } catch { reading = null; }

  return NextResponse.json({ gua, reading });
}
