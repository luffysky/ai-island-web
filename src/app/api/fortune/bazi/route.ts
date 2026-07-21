import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { computeBazi, buildBaziPrompt, parseBaziReading, type BaziChart, type BaziReading } from "@/lib/bazi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Stored = { chart: BaziChart; reading: BaziReading };

/** GET：真八字排盤 + AI 解讀（命盤即時算、解讀依生日快取，改生日才重生）。 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: prof } = await supabase
    .from("fortune_profiles")
    .select("birth_date, birth_time, gender, calendar_type")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!prof?.birth_date) return NextResponse.json({ needProfile: true });

  const chart = computeBazi(prof.birth_date as string, prof.birth_time as string | null, (prof.calendar_type as any) ?? "solar");
  if (!chart) return NextResponse.json({ error: "invalid_birth_date" }, { status: 400 });

  const admin = createSupabaseAdmin();
  // 快取鍵：kind='bazi'、date=生日（改生日→新 row、舊的不命中）
  const cacheDate = prof.birth_date as string;
  const { data: cached } = await admin
    .from("fortune_daily")
    .select("payload")
    .eq("user_id", user.id).eq("date", cacheDate).eq("kind", "bazi")
    .maybeSingle();
  if (cached?.payload?.reading) {
    return NextResponse.json({ chart, reading: (cached.payload as Stored).reading, cached: true });
  }

  const rl = rateLimit(`fortune:bazi:${user.id}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let reading: BaziReading | null = null;
  try {
    const { system, user: userPrompt } = buildBaziPrompt(chart, prof.gender as string | null);
    const res = await completeForUsage("agent_core", { system, user: userPrompt, maxTokens: 800, temperature: 0.75 });
    reading = parseBaziReading(res.text);
  } catch { reading = null; }

  if (!reading) {
    // 解讀失敗仍回命盤（命盤是真算的、有價值），reading 給溫和 fallback、不寫快取
    return NextResponse.json({
      chart,
      reading: {
        overview: "命盤已排出，解讀暫時生不出來，稍後再試一次。",
        strengths: "你有自己的節奏與優勢。", watch: "別對自己太嚴。", advice: "順著本性、穩穩累積。",
      } satisfies BaziReading,
      cached: false, degraded: true,
    });
  }

  await admin.from("fortune_daily")
    .upsert({ user_id: user.id, date: cacheDate, kind: "bazi", payload: { chart, reading } satisfies Stored }, { onConflict: "user_id,date,kind" })
    .then(() => {}, () => {});

  return NextResponse.json({ chart, reading, cached: false });
}
