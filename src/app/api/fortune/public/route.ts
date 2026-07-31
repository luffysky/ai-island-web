import { NextRequest, NextResponse } from "next/server";
import { generateFreeFortune } from "@/lib/fortune-free";
import { ZODIAC_ZH, ZODIAC_EMOJI, zodiacFromBirthDate, type Zodiac } from "@/lib/fortune";
import { taipeiToday } from "@/lib/fortune-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZODIACS = Object.keys(ZODIAC_ZH) as Zodiac[];

/**
 * GET ?zodiac=scorpio 或 ?birth=YYYY-MM-DD
 * → 免登入的「今日基本運勢」（零 AI、決定性、僅供娛樂）。
 * 給未註冊訪客試玩；塔羅/八字/梅花才需註冊（前端引導）。
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let zodiac = sp.get("zodiac") as Zodiac | null;
  const birth = sp.get("birth");
  if ((!zodiac || !ZODIACS.includes(zodiac)) && birth) {
    zodiac = zodiacFromBirthDate(birth);
  }
  if (!zodiac || !ZODIACS.includes(zodiac)) {
    return NextResponse.json({ error: "invalid_zodiac" }, { status: 400 });
  }

  const date = taipeiToday();
  const fortune = generateFreeFortune(zodiac, date);
  return NextResponse.json({
    fortune,
    zodiac,
    zodiacZh: ZODIAC_ZH[zodiac],
    zodiacEmoji: ZODIAC_EMOJI[zodiac],
    date,
    guest: true,
  });
}
