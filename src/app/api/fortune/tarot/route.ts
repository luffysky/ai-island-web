import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { hasAiUnlimited } from "@/lib/ai-privilege";
import { getUserSubTier } from "@/lib/payments/orders";
import { taipeiToday } from "@/lib/fortune-service";
import {
  drawCards, buildTarotPrompt, parseTarotReading, THREE_CARD_POSITIONS,
  TAROT_MAX_QUESTION, DEFAULT_TAROT_QUESTION,
} from "@/lib/tarot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type StoredTarot = {
  question: string;
  cards: Array<{ id: string; name: string; reversed: boolean; position: string; meaning: string }>;
  summary: string;
  advice: string;
};

/** GET：拿今天已抽的塔羅（給頁面回顯）+ 是否還能抽。 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const date = taipeiToday();
  const { data: row } = await admin
    .from("fortune_daily")
    .select("payload")
    .eq("user_id", user.id).eq("date", date).eq("kind", "tarot")
    .maybeSingle();

  const [unlimited, subTier] = await Promise.all([hasAiUnlimited(user.id), getUserSubTier(user.id)]);
  const paid = unlimited || !!subTier;
  const canDraw = paid || !row;

  return NextResponse.json({ reading: (row?.payload as StoredTarot) ?? null, canDraw, paid });
}

/** POST：抽三張牌 + AI 解讀（免費每日 1 次、付費無限）。 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`fortune:tarot:${user.id}`, 8, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", message: "慢一點，牌需要時間感應。" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const question = (String(body.question ?? "").trim() || DEFAULT_TAROT_QUESTION).slice(0, TAROT_MAX_QUESTION);

  const admin = createSupabaseAdmin();
  const date = taipeiToday();

  const [unlimited, subTier] = await Promise.all([hasAiUnlimited(user.id), getUserSubTier(user.id)]);
  const paid = unlimited || !!subTier;

  // 免費：一天一抽
  const { data: existing } = await admin
    .from("fortune_daily")
    .select("payload")
    .eq("user_id", user.id).eq("date", date).eq("kind", "tarot")
    .maybeSingle();
  if (existing && !paid) {
    return NextResponse.json({
      error: "daily_used",
      message: "今天的免費塔羅抽過囉，明天再來、或升級無限占卜。",
      reading: existing.payload as StoredTarot,
    }, { status: 429 });
  }

  // 抽牌（server 決定、防作弊）+ 解讀
  const drawn = drawCards(3);
  let reading;
  try {
    const { system, user: userPrompt } = buildTarotPrompt(question, drawn);
    const res = await completeForUsage("agent_core", { system, user: userPrompt, maxTokens: 700, temperature: 0.85 });
    reading = parseTarotReading(res.text, drawn.length);
  } catch {
    reading = null;
  }
  if (!reading) {
    return NextResponse.json({ error: "gen_failed", message: "牌象一時看不清，稍後再試一次。" }, { status: 502 });
  }

  const stored: StoredTarot = {
    question,
    cards: drawn.map((d, i) => ({
      id: d.card.id, name: d.card.name, reversed: d.reversed,
      position: THREE_CARD_POSITIONS[i] ?? `第 ${i + 1} 張`,
      meaning: reading.cards[i]?.meaning ?? "",
    })),
    summary: reading.summary,
    advice: reading.advice,
  };

  // 免費 upsert（唯一鍵 user+date+tarot、付費當日覆蓋為最新一抽）
  await admin.from("fortune_daily")
    .upsert({ user_id: user.id, date, kind: "tarot", payload: stored }, { onConflict: "user_id,date,kind" })
    .then(() => {}, () => {});

  return NextResponse.json({ reading: stored, canDraw: paid, paid });
}
