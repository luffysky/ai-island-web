/**
 * 八字排盤（真·命理運算，非 AI 亂編）——用 lunar-javascript 從生日+時辰算出正統四柱命盤，
 * 再把「真實命盤」交給 AI 白話解讀（有護欄：傳統參考、不預言吉凶、不做醫投法斷言）。
 * ＊命理是文化/娛樂性質，不對準確度或未來做任何保證。
 */
// lunar-javascript 無型別、default 匯出物件
import LunarLib from "lunar-javascript";
const { Solar, Lunar } = LunarLib as any;

export type Pillar = {
  ganzhi: string;   // 干支，如「乙亥」
  gan: string;      // 天干
  zhi: string;      // 地支
  wuxing: string;   // 五行，如「木水」
  nayin: string;    // 納音
  shishen: string | null; // 十神（日柱＝日主，無十神）
};

export type BaziChart = {
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  dayMaster: string;   // 日主（日干）
  dayMasterWuxing: string; // 日主五行
  shengXiao: string;   // 生肖
  xingZuo: string;     // 星座
  lunarDate: string;   // 農曆日期
  hasHour: boolean;    // 有沒有時辰（無則缺時柱、精度較低）
};

const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

/**
 * 算八字命盤。calendarType='lunar' 時 birthDate 視為農曆。
 * birthTime 為 "HH:MM"，沒有則缺時柱（hasHour=false）。
 * 失敗（日期不合法等）回 null。
 */
export function computeBazi(
  birthDate: string,
  birthTime: string | null | undefined,
  calendarType: "solar" | "lunar" = "solar",
): BaziChart | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const hasHour = typeof birthTime === "string" && /^\d{2}:\d{2}$/.test(birthTime);
  const hh = hasHour ? Number(birthTime!.slice(0, 2)) : 12;
  const mm = hasHour ? Number(birthTime!.slice(3, 5)) : 0;

  try {
    let solar: any;
    if (calendarType === "lunar") {
      const lunar = Lunar.fromYmdHms(y, mo, d, hh, mm, 0);
      solar = lunar.getSolar();
    } else {
      solar = Solar.fromYmdHms(y, mo, d, hh, mm, 0);
    }
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();

    const pillar = (gz: string, gan: string, zhi: string, wx: string, nayin: string, shishen: string | null): Pillar =>
      ({ ganzhi: gz, gan, zhi, wuxing: wx, nayin, shishen });

    const dayGan = ec.getDayGan();
    const chart: BaziChart = {
      pillars: {
        year: pillar(ec.getYear(), ec.getYearGan(), ec.getYearZhi(), ec.getYearWuXing(), ec.getYearNaYin(), ec.getYearShiShenGan()),
        month: pillar(ec.getMonth(), ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthWuXing(), ec.getMonthNaYin(), ec.getMonthShiShenGan()),
        day: pillar(ec.getDay(), dayGan, ec.getDayZhi(), ec.getDayWuXing(), ec.getDayNaYin(), null),
        hour: hasHour
          ? pillar(ec.getTime(), ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeWuXing(), ec.getTimeNaYin(), ec.getTimeShiShenGan())
          : null,
      },
      dayMaster: dayGan,
      dayMasterWuxing: GAN_WUXING[dayGan] ?? "",
      shengXiao: lunar.getYearShengXiao(),
      xingZuo: solar.getXingZuo(),
      lunarDate: `${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月 ${lunar.getDayInChinese()}`,
      hasHour,
    };
    return chart;
  } catch {
    return null;
  }
}

// ── AI 解讀 ─────────────────────────────────────────────

export type BaziReading = {
  overview: string;   // 命盤總述（性格、格局）
  strengths: string;  // 天賦/優勢
  watch: string;      // 要留意的傾向
  advice: string;     // 一句可執行的建議
};

const GUARDRAIL = [
  "你是溫暖、有底蘊的八字命理解讀者。用繁體中文、口語親切像長輩聊天。",
  "護欄：",
  "1. 八字是傳統文化的『性格與傾向』參考工具，不是宿命預言；語氣正向、給行動建議、不製造恐懼焦慮、不用宿命論嚇人。",
  "2. 不做醫療 / 投資理財 / 法律的具體斷言（可講心態，不可講該吃什麼藥、該買什麼、官司會怎樣）。",
  "3. 扣著實際命盤（日主、五行、十神）解讀，講性格特質與生活傾向，別空泛套話。",
  "4. 只輸出 JSON、不要多餘文字或 markdown 圍欄。",
].join("\n");

export function buildBaziPrompt(chart: BaziChart, gender?: string | null): { system: string; user: string } {
  const p = chart.pillars;
  const line = (name: string, pl: Pillar | null) =>
    pl ? `${name}柱：${pl.ganzhi}（${pl.gan}${pl.zhi}）五行 ${pl.wuxing}${pl.shishen ? `　十神 ${pl.shishen}` : "（日主）"}　納音 ${pl.nayin}` : `${name}柱：（無時辰、略）`;
  const g = gender === "male" ? "男命" : gender === "female" ? "女命" : "";
  const user = [
    `以下是真實排出的八字命盤${g ? `（${g}）` : ""}，請據此白話解讀：`,
    line("年", p.year),
    line("月", p.month),
    line("日", p.day),
    line("時", p.hour),
    `日主：${chart.dayMaster}（${chart.dayMasterWuxing}）　生肖：${chart.shengXiao}　星座：${chart.xingZuo}`,
    chart.hasHour ? "" : "※ 未提供時辰，時柱從缺、解讀以年月日三柱為主、精度較低。",
    "",
    "輸出 JSON：",
    `{"overview":"命盤總述：性格、格局、五行偏向（3-4句）","strengths":"天賦與優勢（2句）","watch":"要留意的傾向與如何調適（2句）","advice":"一句可執行的生活建議"}`,
  ].filter(Boolean).join("\n");
  return { system: GUARDRAIL, user };
}

export function parseBaziReading(text: string): BaziReading | null {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) return null;
  let obj: any;
  try { obj = JSON.parse(t.slice(s, e + 1)); } catch { return null; }
  if (!obj || typeof obj !== "object") return null;
  const str = (v: any, fb = "") => (typeof v === "string" && v.trim() ? v.trim() : fb);
  const overview = str(obj.overview);
  if (!overview) return null;
  return {
    overview,
    strengths: str(obj.strengths, "你有自己的節奏與優勢，慢慢會顯出來。"),
    watch: str(obj.watch, "偶爾對自己太嚴，記得放過自己一點。"),
    advice: str(obj.advice, "順著本性走，穩穩累積就好。"),
  };
}
