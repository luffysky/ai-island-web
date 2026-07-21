/**
 * 每日運勢核心邏輯（純函式、可測）
 *  - 西洋星座：由生日月/日算（零外部庫）
 *  - 運勢 prompt 組裝 + 結構化 JSON 解析（護欄：不做醫療/投資/法律斷言、正向不製造焦慮）
 *  - 八字/紫微/農曆屬進階，之後接 lunar-javascript（見 todo §1.2.3）
 */

export type Zodiac =
  | "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo"
  | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";

export const ZODIAC_ZH: Record<Zodiac, string> = {
  aries: "牡羊座", taurus: "金牛座", gemini: "雙子座", cancer: "巨蟹座",
  leo: "獅子座", virgo: "處女座", libra: "天秤座", scorpio: "天蠍座",
  sagittarius: "射手座", capricorn: "摩羯座", aquarius: "水瓶座", pisces: "雙魚座",
};

export const ZODIAC_EMOJI: Record<Zodiac, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
  leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
  sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};

// 星座區間 [起始月, 起始日]（含當日）— 依國曆
const ZODIAC_RANGES: Array<{ z: Zodiac; from: [number, number] }> = [
  { z: "capricorn", from: [12, 22] }, // 12/22–1/19
  { z: "aquarius", from: [1, 20] },
  { z: "pisces", from: [2, 19] },
  { z: "aries", from: [3, 21] },
  { z: "taurus", from: [4, 20] },
  { z: "gemini", from: [5, 21] },
  { z: "cancer", from: [6, 22] },
  { z: "leo", from: [7, 23] },
  { z: "virgo", from: [8, 23] },
  { z: "libra", from: [9, 23] },
  { z: "scorpio", from: [10, 24] },
  { z: "sagittarius", from: [11, 23] },
  { z: "capricorn", from: [12, 22] },
];

/** 由國曆生日字串（YYYY-MM-DD）算西洋星座。無效輸入回 null。 */
export function zodiacFromBirthDate(birthDate: string): Zodiac | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // 找最後一個「起始 (月,日) <= 生日 (月,日)」的星座
  let result: Zodiac = "capricorn";
  for (const { z, from } of ZODIAC_RANGES) {
    const [fm, fd] = from;
    if (month > fm || (month === fm && day >= fd)) result = z;
  }
  return result;
}

// ── 運勢生成 ───────────────────────────────────────────────

export type FortunePayload = {
  overall: string;      // 整體
  love: string;         // 愛情
  career: string;       // 事業
  wealth: string;       // 財運
  luckyColor: string;   // 幸運色
  luckyNumber: number;  // 幸運數字
  tip: string;          // 一句提醒
  score?: number;       // 今日綜合分（0–100、給進度環用）
};

export type FortuneInput = {
  zodiac: Zodiac;
  gender?: string | null;
  date: string;         // 台北日 YYYY-MM-DD
};

const GUARDRAIL = [
  "你是溫暖、正向的每日運勢小助手。用繁體中文、口語親切、像朋友聊天。",
  "嚴格護欄：",
  "1. 不做任何醫療、投資理財、法律的「具體斷言或指示」（可講心態、不可講「該買某股/該吃某藥/一定會贏官司」）。",
  "2. 語氣正向、給行動建議、不製造焦慮或恐懼、不用宿命論嚇人。",
  "3. 每個面向 1–2 句、生活化、可執行。避免空話。",
  "4. 只輸出 JSON、不要多餘文字或 markdown 圍欄。",
].join("\n");

export function buildFortunePrompt(input: FortuneInput): { system: string; user: string } {
  const zh = ZODIAC_ZH[input.zodiac];
  const genderHint = input.gender === "male" ? "（男生）" : input.gender === "female" ? "（女生）" : "";
  const user = [
    `為「${zh}${genderHint}」產生 ${input.date} 的每日運勢。`,
    "輸出 JSON，欄位：",
    "overall(整體，2句), love(愛情), career(事業), wealth(財運), luckyColor(幸運色，中文顏色名), luckyNumber(幸運數字，1–9整數), tip(一句今日提醒), score(0–100今日綜合分)。",
    "範例格式：",
    `{"overall":"...","love":"...","career":"...","wealth":"...","luckyColor":"天空藍","luckyNumber":7,"tip":"...","score":82}`,
  ].join("\n");
  return { system: GUARDRAIL, user };
}

/** 容錯解析 LLM 回傳的運勢 JSON（切到第一個 { ~ 最後一個 }）。失敗回 null。 */
export function parseFortune(text: string): FortunePayload | null {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) return null;
  let obj: any;
  try {
    obj = JSON.parse(t.slice(s, e + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const str = (v: any, fallback = "") => (typeof v === "string" && v.trim() ? v.trim() : fallback);
  const overall = str(obj.overall);
  if (!overall) return null; // 至少要有整體、否則視為失敗
  let num = Number(obj.luckyNumber);
  if (!Number.isFinite(num) || num < 1 || num > 9) num = ((Math.abs(Math.round(num)) % 9) || 9);
  let score = Number(obj.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) score = undefined as any;
  return {
    overall,
    love: str(obj.love, "今天適合對在乎的人多一點耐心。"),
    career: str(obj.career, "把手上的事一件一件收好，穩穩推進。"),
    wealth: str(obj.wealth, "小額開銷留意一下，別衝動消費。"),
    luckyColor: str(obj.luckyColor, "天空藍"),
    luckyNumber: num,
    tip: str(obj.tip, "深呼吸，今天也會好好的。"),
    score,
  };
}
