/**
 * 訊息軍師：幫使用者把難開口的話講好。純資料 + prompt 組裝 + 解析（可測、零外部依賴）。
 * API `/api/message-coach` 與前端共用這裡的 SCENARIOS / TONES。
 */

export type Scenario = {
  id: string;
  emoji: string;
  label: string;
  hint: string;            // 提示使用者要填哪些要點
  defaultTone: ToneId;
};

export type ToneId = "polite" | "professional" | "firm" | "humorous" | "warm";
export type Tone = { id: ToneId; label: string; desc: string };

export const TONES: Tone[] = [
  { id: "polite", label: "客氣", desc: "禮貌、留餘地、不失禮" },
  { id: "professional", label: "專業", desc: "簡潔、有條理、像職場信" },
  { id: "firm", label: "堅定", desc: "立場清楚、不軟不兇" },
  { id: "humorous", label: "幽默", desc: "輕鬆、化解尷尬" },
  { id: "warm", label: "溫暖", desc: "有溫度、照顧對方感受" },
];

export const SCENARIOS: Scenario[] = [
  { id: "raise", emoji: "💰", label: "跟主管談加薪", hint: "你的貢獻/成果、期望幅度、時機（例：接了兩個大專案、想談 15%）", defaultTone: "professional" },
  { id: "decline", emoji: "🙅", label: "婉拒邀約/請求", hint: "誰邀你、要拒絕什麼、想不想留關係（例：同事約週末加班、想拒但不想尷尬）", defaultTone: "polite" },
  { id: "apology", emoji: "🙇", label: "道歉/認錯", hint: "對誰、做錯什麼、想怎麼補救（例：漏回客戶訊息、想道歉並補寄資料）", defaultTone: "warm" },
  { id: "collect", emoji: "📩", label: "催款/催進度", hint: "對象、欠什麼、期限（例：客戶尾款拖兩週、想禮貌催但要收到錢）", defaultTone: "firm" },
  { id: "leave", emoji: "🏖️", label: "請假/調班", hint: "跟誰請、原因、天數（例：跟主管請三天、家裡有事、想講得體）", defaultTone: "polite" },
  { id: "landlord", emoji: "🏠", label: "跟房東溝通", hint: "要談什麼、你的訴求（例：熱水器壞了想請他修、或想談降租）", defaultTone: "firm" },
  { id: "teacher", emoji: "🎓", label: "跟老師/教授", hint: "身分、要談什麼（例：作業想延交、想約 office hour 問問題）", defaultTone: "polite" },
  { id: "client", emoji: "🤝", label: "跟客戶溝通", hint: "案子狀況、要傳達什麼（例：交期要延、想解釋原因並給新時間）", defaultTone: "professional" },
  { id: "complaint", emoji: "😤", label: "客訴/投訴回應", hint: "你是哪方、發生什麼、想達成什麼（例：收到瑕疵品想退換、或我是店家要回覆奧客）", defaultTone: "professional" },
  { id: "ex", emoji: "💔", label: "難開口的私訊", hint: "對象與關係、想說什麼（例：想跟前任要回東西、或想跟朋友道歉和好）", defaultTone: "warm" },
  { id: "reject_confess", emoji: "🌸", label: "婉拒告白/邀約", hint: "對方是誰、你的想法（例：想拒絕但保住友情）", defaultTone: "warm" },
  { id: "boundary", emoji: "🛑", label: "設界線/拒絕情勒", hint: "誰、越了什麼界、你的底線（例：親戚一直問薪水、想擋掉又不撕破臉）", defaultTone: "firm" },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
export function getTone(id: string): Tone | undefined {
  return TONES.find((t) => t.id === id);
}

export type CoachInput = { scenario: Scenario; points: string; tone: Tone };
export type CoachVersion = { style: string; message: string };

const GUARDRAIL = [
  "你是「訊息軍師」，專門幫人把難開口的話寫得得體、有效、不失分寸。用繁體中文。",
  "規則：",
  "1. 直接給「可以照抄傳出去」的訊息本文，不要教學、不要解釋、不要加前言。",
  "2. 產出 3 個版本、語氣層次略不同（同一個指定語氣底下的變化：短版 / 完整版 / 更委婉或更有溫度版）。",
  "3. 站在寄件者立場、顧及對方感受、目標是把事情談成又不傷關係。",
  "4. 不捏造不存在的事實；資訊不足處用中性佔位（如「（附上檔案）」）。",
  "5. 不寫違法、脅迫、辱罵、或操弄對方的內容。",
  "6. 只輸出 JSON 陣列、不要多餘文字或 markdown 圍欄。",
].join("\n");

export function buildCoachPrompt(input: CoachInput, refine?: string): { system: string; user: string } {
  const lines = [
    `情境：${input.scenario.label}`,
    `語氣：${input.tone.label}（${input.tone.desc}）`,
    `我想表達的要點：${input.points.trim()}`,
  ];
  if (refine && refine.trim()) lines.push(`額外調整：${refine.trim()}`);
  lines.push(
    "",
    "請產出 3 個可直接傳送的訊息版本，輸出 JSON 陣列：",
    `[{"style":"簡短版","message":"..."},{"style":"完整版","message":"..."},{"style":"更${input.tone.label}版","message":"..."}]`,
  );
  return { system: GUARDRAIL, user: lines.join("\n") };
}

/** 容錯解析 AI 回傳（切第一個 [ ~ 最後一個 ]）。失敗回 []。 */
export function parseCoachVersions(text: string): CoachVersion[] {
  if (!text) return [];
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.indexOf("[");
  const e = t.lastIndexOf("]");
  if (s === -1 || e === -1 || e < s) return [];
  let arr: any;
  try {
    arr = JSON.parse(t.slice(s, e + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: CoachVersion[] = [];
  for (let i = 0; i < arr.length; i++) {
    const it = arr[i];
    const message = typeof it?.message === "string" ? it.message.trim()
      : typeof it === "string" ? it.trim() : "";
    if (!message) continue;
    const style = typeof it?.style === "string" && it.style.trim() ? it.style.trim() : `版本 ${i + 1}`;
    out.push({ style, message });
  }
  return out.slice(0, 3);
}

export const MC_MAX_POINTS = 800;
export const MC_FREE_DAILY = 3;   // 免費每日次數（付費/特權無限）
