/**
 * ai-intent — 意圖分類 + context 組裝（統一 prompt 建構的小工具）
 *
 * 設計原則：
 *  - 純函式、零外部依賴、可在 server / edge / client 任意環境跑。
 *  - 「可選採用」：現有呼叫端不改也能繼續跑；想升級的功能才 import 這裡的 helper。
 *  - classifyIntent：輕量啟發式（繁中 + 英文關鍵字 + 標點），不打 AI、零成本。
 *  - assembleContext：把 persona / 使用者設定 / 記憶 / 任務 收斂成一份 system prompt，
 *    自動插入 Anthropic prompt-cache 邊界（PROMPT_CACHE_MARKER）分開「穩定前綴」與「個人化後綴」。
 */
import { PROMPT_CACHE_MARKER } from "./ai-providers";

// ───────────────────────── 意圖分類 ─────────────────────────
export type Intent =
  | "question"    // 問問題 / 求解釋
  | "create"      // 要產生內容（寫程式 / 文案 / 點子）
  | "encourage"   // 情緒 / 打氣 / 抱怨
  | "grade"       // 批改 / 評分 / 給回饋
  | "translate"   // 翻譯
  | "summarize"   // 摘要 / 濃縮
  | "chitchat";   // 閒聊 / 打招呼

export type IntentResult = {
  intent: Intent;
  confidence: number;              // 0~1（越高越確定）
  scores: Record<Intent, number>;  // 各意圖原始分數（debug / 排序用）
};

const KEYWORDS: Record<Intent, RegExp[]> = {
  question: [/為什麼|為何|怎麼|如何|是什麼|什麼是|解釋|說明|請問|可以.*嗎|\?|？/i, /\bwhy\b|\bhow\b|\bwhat\b|\bexplain\b/i],
  create: [/寫(一|個|支|段)?|產生|生成|做一個|幫我.*(寫|做|生)|實作|設計|想(幾|一)?個|發想|點子|草稿/i, /\b(write|create|generate|build|implement|draft|design)\b/i],
  encourage: [/好累|想放棄|撐不住|好難|沮喪|焦慮|壓力|沒動力|心情|加油|鼓勵|安慰/i, /\b(tired|give up|stuck|anxious|stressed|encourage)\b/i],
  grade: [/批改|評分|打分|給.*回饋|幫我看|檢查(一下)?|review|哪裡(有|寫)?錯|對不對|正確嗎/i, /\b(grade|review|check|feedback|correct)\b/i],
  translate: [/翻譯|翻成|譯成|中翻英|英翻中|translate/i],
  summarize: [/摘要|總結|濃縮|重點整理|tl;?dr|summari[sz]e|簡述|懶人包/i],
  chitchat: [/^(嗨|哈囉|你好|安安|hi|hello|hey|嘿|在嗎|早安|午安|晚安)\b/i, /謝謝|感謝|thanks/i],
};

// 意圖優先序（同分時的 tie-break：越前面越優先，避免 chitchat 蓋掉實質意圖）
const PRIORITY: Intent[] = ["grade", "translate", "summarize", "create", "encourage", "question", "chitchat"];

/**
 * 依關鍵字/標點把一段使用者輸入分到某意圖。
 * 純啟發式、零成本；要更準可把結果餵給便宜模型二次確認（呼叫端自行決定）。
 */
export function classifyIntent(text: string): IntentResult {
  const t = (text ?? "").trim();
  const scores = { question: 0, create: 0, encourage: 0, grade: 0, translate: 0, summarize: 0, chitchat: 0 } as Record<Intent, number>;

  for (const intent of PRIORITY) {
    for (const re of KEYWORDS[intent]) if (re.test(t)) scores[intent] += 1;
  }
  // 含程式碼 → 偏向 create / grade
  if (/```|\bfunction\b|\bclass\b|=>|;\s*$/m.test(t)) { scores.create += 0.5; scores.grade += 0.5; }
  // 很短 + 無實質關鍵字 → 偏 chitchat
  if (t.replace(/\s+/g, "").length <= 6 && Object.values(scores).every((v) => v === 0)) scores.chitchat += 1;

  let best: Intent = "question";  // 預設：把不確定的當成「問問題」（最常見、最安全）
  let bestScore = -1;
  for (const intent of PRIORITY) {
    if (scores[intent] > bestScore) { best = intent; bestScore = scores[intent]; }
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = total > 0 ? Math.min(1, bestScore / total) : 0.25;
  return { intent: best, confidence, scores };
}

// ───────────────────────── Context 組裝 ─────────────────────────
export type AssembleInput = {
  /** 穩定前綴：跨使用者共用（會設 prompt-cache 邊界）。persona / 角色設定 / 全站規則。 */
  persona?: string;
  /** 全站/場景規則（也算穩定前綴）。 */
  rules?: string | string[];
  /** 個人化後綴：使用者設定（語氣、暱稱、程度…）。 */
  userSettings?: Record<string, any> | string | null;
  /** 個人化後綴：長期記憶 / 摘要。 */
  memory?: string | string[] | null;
  /** 當前任務描述 / 意圖提示。 */
  task?: string | null;
  /** 額外個人化片段（章節、學習狀態…）。 */
  extra?: string | string[] | null;
  /** 是否插入 prompt-cache 邊界（預設 true；前綴穩定、後綴個人化 → 跨使用者命中快取）。 */
  cacheBoundary?: boolean;
};

function joinLines(v: string | string[] | null | undefined): string {
  if (!v) return "";
  return (Array.isArray(v) ? v : [v]).map((x) => String(x).trim()).filter(Boolean).join("\n");
}

function settingsToText(s: AssembleInput["userSettings"]): string {
  if (!s) return "";
  if (typeof s === "string") return s.trim();
  const parts: string[] = [];
  for (const [k, val] of Object.entries(s)) {
    if (val === null || val === undefined || val === "") continue;
    parts.push(`- ${k}：${typeof val === "object" ? JSON.stringify(val) : String(val)}`);
  }
  return parts.length ? `使用者偏好設定：\n${parts.join("\n")}` : "";
}

/**
 * 把 persona / 規則 / 使用者設定 / 記憶 / 任務 統一組成一份 system prompt。
 * 回傳可直接當 messages[0] 的 system content。
 *
 * 穩定前綴（persona + rules）與 個人化後綴（settings + memory + task + extra）
 * 之間插入 PROMPT_CACHE_MARKER，讓 Anthropic 端把前綴設成共用 cache block。
 */
export function assembleContext(input: AssembleInput): string {
  const prefixParts = [joinLines(input.persona), joinLines(input.rules)].filter(Boolean);
  const suffixParts = [
    settingsToText(input.userSettings),
    input.memory ? `【長期記憶】\n${joinLines(input.memory)}` : "",
    input.extra ? joinLines(input.extra) : "",
    input.task ? `【本次任務】\n${String(input.task).trim()}` : "",
  ].filter(Boolean);

  const prefix = prefixParts.join("\n\n");
  const suffix = suffixParts.join("\n\n");

  if (!suffix) return prefix;
  if (!prefix) return suffix;

  const boundary = input.cacheBoundary === false ? "\n\n" : `\n\n${PROMPT_CACHE_MARKER}`;
  return `${prefix}${boundary}${suffix}`;
}
