/**
 * 每日運勢服務層：拿(或生成)某人某日的運勢。
 * /api/fortune/today 與 cron/fortune-daily 共用、避免重複生成邏輯。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeForUsage } from "./resolve-usage-ai";
import {
  buildFortunePrompt, parseFortune, zodiacFromBirthDate,
  ZODIAC_ZH, ZODIAC_EMOJI, type Zodiac, type FortunePayload,
} from "./fortune";
import { generateFreeFortune } from "./fortune-free";

// 預設用「免費・零 AI 決定性生成」（大量每日推播也零成本）。
// 想改回 AI 生成（較個人化但每人每日燒一次 LLM）：設 env FORTUNE_USE_AI=1。
const USE_AI = process.env.FORTUNE_USE_AI === "1";

export function taipeiToday(): string {
  return new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
}

export type FortuneResult = {
  fortune: FortunePayload;
  zodiac: Zodiac;
  zodiacZh: string;
  zodiacEmoji: string;
  date: string;
  cached: boolean;
  degraded?: boolean;
};

/**
 * 拿某人某日的每日運勢：先查快取、沒有才生成並寫回（冪等、唯一鍵擋併發）。
 * 需要 service-role client（cron / API 都用 admin）。
 * 回 null 表示該使用者還沒填生日資料。
 */
export async function getOrCreateDailyFortune(
  admin: SupabaseClient,
  userId: string,
  date = taipeiToday(),
): Promise<FortuneResult | null> {
  const { data: prof } = await admin
    .from("fortune_profiles")
    .select("birth_date, gender, zodiac")
    .eq("user_id", userId)
    .maybeSingle();
  if (!prof) return null;

  const zodiac = ((prof.zodiac as Zodiac) || zodiacFromBirthDate(prof.birth_date as string)) as Zodiac | null;
  if (!zodiac) return null;

  const meta = { zodiac, zodiacZh: ZODIAC_ZH[zodiac], zodiacEmoji: ZODIAC_EMOJI[zodiac], date };

  // 快取命中
  const { data: cached } = await admin
    .from("fortune_daily")
    .select("payload")
    .eq("user_id", userId).eq("date", date).eq("kind", "daily")
    .maybeSingle();
  if (cached?.payload) {
    return { fortune: cached.payload as FortunePayload, ...meta, cached: true };
  }

  // 生成：預設免費決定性生成（零 AI）；env 開了才用 AI
  let fortune: FortunePayload | null = null;
  if (USE_AI) {
    try {
      const { system, user } = buildFortunePrompt({ zodiac, gender: prof.gender, date });
      const res = await completeForUsage("agent_core", { system, user, maxTokens: 700, temperature: 0.8 });
      fortune = parseFortune(res.text);
    } catch {
      fortune = null;
    }
    if (!fortune) fortune = generateFreeFortune(zodiac, date); // AI 失敗 → 退回免費版
  } else {
    fortune = generateFreeFortune(zodiac, date);
  }

  await admin.from("fortune_daily")
    .insert({ user_id: userId, date, kind: "daily", payload: fortune })
    .select().maybeSingle(); // 唯一鍵衝突（併發）→ 忽略

  return { fortune, ...meta, cached: false };
}
