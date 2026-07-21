/**
 * 塔羅牌庫（78 張：22 大阿爾克那 + 56 小阿爾克那）+ 抽牌邏輯。純資料/純函式、可測。
 * 給每日運勢第二刀（`/api/fortune/tarot`）用：抽牌 → 依牌 + 提問交給 LLM 解讀。
 * keywords 只給「關鍵字」、真正解讀交給 AI（避免死板、也讓解讀貼合使用者的問題）。
 */

export type TarotCard = {
  id: string;               // major-00 / wands-01 …
  name: string;             // 中文牌名
  arcana: "major" | "minor";
  suit?: TarotSuit;
  upright: string[];        // 正位關鍵字
  reversed: string[];       // 逆位關鍵字
};

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

export const SUIT_ZH: Record<TarotSuit, string> = {
  wands: "權杖", cups: "聖杯", swords: "寶劍", pentacles: "錢幣",
};

// ── 22 大阿爾克那 ─────────────────────────────────────────
const MAJORS: Array<[string, string[], string[]]> = [
  ["愚者", ["新開始", "冒險", "純真", "自由"], ["魯莽", "猶豫", "不切實際"]],
  ["魔術師", ["行動力", "創造", "資源到位", "自信"], ["拖延", "空談", "操弄"]],
  ["女祭司", ["直覺", "內在智慧", "靜觀", "秘密"], ["忽視直覺", "壓抑", "表裡不一"]],
  ["女皇", ["豐盛", "滋養", "感性", "創造力"], ["過度依賴", "停滯", "耗竭"]],
  ["皇帝", ["權威", "秩序", "穩定", "掌控"], ["專斷", "僵化", "失控"]],
  ["教皇", ["傳統", "指引", "學習", "信念"], ["墨守成規", "反叛", "教條"]],
  ["戀人", ["結合", "選擇", "價值一致", "愛"], ["分歧", "誘惑", "失衡"]],
  ["戰車", ["前進", "意志", "掌握方向", "勝利"], ["失焦", "衝動", "受阻"]],
  ["力量", ["勇氣", "溫柔的堅定", "自制", "耐心"], ["自我懷疑", "急躁", "軟弱"]],
  ["隱者", ["內省", "獨處", "尋找答案", "指引"], ["孤立", "逃避", "固執己見"]],
  ["命運之輪", ["轉機", "循環", "時機", "順勢"], ["失控", "壞運循環", "抗拒改變"]],
  ["正義", ["公平", "因果", "負責", "誠實"], ["偏頗", "逃避責任", "不公"]],
  ["倒吊人", ["換角度", "放下", "等待", "犧牲"], ["拖延", "無謂犧牲", "卡住"]],
  ["死神", ["結束與重生", "轉化", "放手", "蛻變"], ["抗拒改變", "停滯", "拖著不放"]],
  ["節制", ["平衡", "調和", "耐心", "中庸"], ["失衡", "過度", "不耐"]],
  ["惡魔", ["束縛", "慾望", "執著", "誘惑"], ["掙脫", "覺察", "解放"]],
  ["高塔", ["劇變", "崩解", "覺醒", "打掉重練"], ["逃避災難", "拖延崩壞", "餘震"]],
  ["星星", ["希望", "療癒", "靈感", "信心"], ["失望", "自我懷疑", "枯竭"]],
  ["月亮", ["不確定", "潛意識", "幻象", "焦慮"], ["釐清", "走出迷霧", "真相浮現"]],
  ["太陽", ["喜悅", "成功", "活力", "光明"], ["暫時受挫", "過度樂觀", "延遲"]],
  ["審判", ["覺醒", "重生", "召喚", "總結"], ["自我批判", "猶豫", "逃避清算"]],
  ["世界", ["圓滿", "完成", "整合", "成就"], ["未竟", "延宕", "差臨門一腳"]],
];

// ── 小阿爾克那：每花色一組主題關鍵字（依牌階微調） ────────
const SUIT_THEME: Record<TarotSuit, { up: string[]; rev: string[] }> = {
  wands: { up: ["熱情", "行動", "創意", "動力"], rev: ["拖延", "內耗", "方向不明"] },
  cups: { up: ["情感", "關係", "直覺", "連結"], rev: ["情緒卡住", "失望", "冷淡"] },
  swords: { up: ["思考", "溝通", "決斷", "真相"], rev: ["糾結", "衝突", "焦慮"] },
  pentacles: { up: ["務實", "金錢", "穩定", "累積"], rev: ["匱乏感", "停滯", "計較"] },
};

const RANK_ZH = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const COURT_ZH = ["侍者", "騎士", "皇后", "國王"];

function buildMinors(): TarotCard[] {
  const out: TarotCard[] = [];
  const suits: TarotSuit[] = ["wands", "cups", "swords", "pentacles"];
  for (const suit of suits) {
    const theme = SUIT_THEME[suit];
    for (let rank = 1; rank <= 14; rank++) {
      const label = rank <= 10 ? `${SUIT_ZH[suit]}${RANK_ZH[rank - 1]}` : `${SUIT_ZH[suit]}${COURT_ZH[rank - 11]}`;
      out.push({
        id: `${suit}-${String(rank).padStart(2, "0")}`,
        name: label,
        arcana: "minor",
        suit,
        upright: theme.up,
        reversed: theme.rev,
      });
    }
  }
  return out;
}

export const TAROT_DECK: TarotCard[] = [
  ...MAJORS.map(([name, up, rev], i) => ({
    id: `major-${String(i).padStart(2, "0")}`,
    name,
    arcana: "major" as const,
    upright: up,
    reversed: rev,
  })),
  ...buildMinors(),
];

export type DrawnCard = { card: TarotCard; reversed: boolean };

/**
 * 抽 n 張不重複的牌（各張獨立決定正/逆位）。
 * rand: 注入亂數（測試可控），預設 Math.random。
 */
export function drawCards(n: number, rand: () => number = Math.random): DrawnCard[] {
  const count = Math.max(1, Math.min(n, TAROT_DECK.length));
  const idx = new Set<number>();
  while (idx.size < count) {
    idx.add(Math.floor(rand() * TAROT_DECK.length));
  }
  return [...idx].map((i) => ({ card: TAROT_DECK[i], reversed: rand() < 0.5 }));
}

/** 給 LLM 的牌面描述（含正逆位關鍵字），交由 AI 依提問解讀。 */
export function describeDraw(drawn: DrawnCard[]): string {
  return drawn
    .map((d, i) => {
      const pos = d.reversed ? "逆位" : "正位";
      const kw = (d.reversed ? d.card.reversed : d.card.upright).join("、");
      return `${i + 1}. ${d.card.name}（${pos}）— 關鍵字：${kw}`;
    })
    .join("\n");
}

export const TAROT_MAX_QUESTION = 200;
export const DEFAULT_TAROT_QUESTION = "我最近的整體狀態、需要注意什麼？";

// 三張牌陣＝過去 / 現在 / 未來
export const THREE_CARD_POSITIONS = ["過去 / 起因", "現在 / 現況", "未來 / 走向"];

const TAROT_GUARDRAIL = [
  "你是溫暖、有洞見的塔羅解讀者。用繁體中文、口語像朋友。",
  "護欄：",
  "1. 塔羅是「幫你換角度思考」的工具，不是宿命預言；語氣正向、給行動建議、不製造恐懼。",
  "2. 不做醫療 / 投資 / 法律的具體斷言。",
  "3. 針對使用者的提問、扣著抽到的牌與正逆位解讀，別空泛。",
  "4. 只輸出 JSON、不要多餘文字或 markdown 圍欄。",
].join("\n");

/** 三張牌陣的解讀 prompt（要求 JSON：每張一句 + 總結建議）。 */
export function buildTarotPrompt(question: string, drawn: DrawnCard[]): { system: string; user: string } {
  const cards = drawn.map((d, i) => {
    const pos = d.reversed ? "逆位" : "正位";
    const kw = (d.reversed ? d.card.reversed : d.card.upright).join("、");
    const slot = THREE_CARD_POSITIONS[i] ?? `第 ${i + 1} 張`;
    return `${slot}：${d.card.name}（${pos}）關鍵字 ${kw}`;
  }).join("\n");
  const user = [
    `使用者的提問：${question}`,
    "抽到的三張牌（過去/現在/未來牌陣）：",
    cards,
    "",
    "請解讀，輸出 JSON：",
    `{"cards":[{"meaning":"針對『過去/起因』這張的一句解讀"},{"meaning":"現在"},{"meaning":"未來"}],"summary":"綜合三張牌回應提問的 2-3 句","advice":"一句可執行的建議"}`,
  ].join("\n");
  return { system: TAROT_GUARDRAIL, user };
}

export type TarotReading = {
  cards: Array<{ meaning: string }>;
  summary: string;
  advice: string;
};

/** 容錯解析塔羅解讀 JSON。失敗回 null。 */
export function parseTarotReading(text: string, cardCount: number): TarotReading | null {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) return null;
  let obj: any;
  try { obj = JSON.parse(t.slice(s, e + 1)); } catch { return null; }
  if (!obj || typeof obj !== "object") return null;
  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
  if (!summary) return null;
  const rawCards = Array.isArray(obj.cards) ? obj.cards : [];
  const cards = Array.from({ length: cardCount }, (_, i) => ({
    meaning: typeof rawCards[i]?.meaning === "string" ? rawCards[i].meaning.trim() : "",
  }));
  return {
    cards,
    summary,
    advice: typeof obj.advice === "string" && obj.advice.trim() ? obj.advice.trim() : "順著牌給的提醒，先踏出一小步就好。",
  };
}
