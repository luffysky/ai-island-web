/**
 * 演算法 #2 — AI 模型路由
 *
 * 輸入：使用者問題、context（chapter / lesson / 用戶 level / 是否 first message）
 * 輸出：應該用哪個 tier（cheap / mid / pro）
 *
 * 規則（簡單啟發、可未來 ML 化）：
 *  1. 字數 / token 估算
 *  2. 含程式碼 / 長 code block → mid 起跳
 *  3. 含「為什麼」「解釋」「比較」「設計」「重構」「除錯」→ pro
 *  4. 含「翻譯」「拼字」「示範」「幾個 X」「列表」→ cheap 就好
 *  5. follow-up（非首次）默 mid（連貫上下文已建立）
 *  6. user level < 5 → 若 cheap 也夠、優先 cheap（省 token）
 */

export type ModelTier = "cheap" | "mid" | "pro";

export type RouteInput = {
  question: string;
  isFirstMessage: boolean;
  userLevel?: number;
  contextChapterId?: number | null;
  hasCodeContext?: boolean;
};

export type RouteDecision = {
  tier: ModelTier;
  reasons: string[];
  score: number; // 0-100、越高越複雜
};

const PRO_KEYWORDS = [
  "為什麼", "為何", "解釋", "比較", "差異", "設計", "重構", "架構",
  "除錯", "debug", "錯誤分析", "效能", "優化", "原理", "推導", "證明",
  "trade-off", "tradeoff", "權衡", "選擇哪個", "best practice",
];

const MID_KEYWORDS = [
  "怎麼做", "怎麼寫", "如何", "範例", "教我", "step by step",
  "implement", "實作", "寫一個", "create", "build",
];

const CHEAP_KEYWORDS = [
  "翻譯", "拼字", "示範", "幾個", "列出", "list",
  "what is", "什麼是", "定義", "縮寫", "縮寫是",
];

const CODE_PATTERNS = [
  /```[\s\S]*?```/g,
  /\bfunction\s+\w+\s*\(/,
  /\bclass\s+[A-Z]\w*/,
  /=>\s*\{/,
  /\bimport\s+.+\bfrom\s+["'].+["']/,
];

export function routeModel(input: RouteInput): RouteDecision {
  const q = input.question ?? "";
  const len = q.length;
  const reasons: string[] = [];
  let score = 0;

  // 字長
  if (len > 500) { score += 25; reasons.push(`長問題 ${len} 字`); }
  else if (len > 150) { score += 12; reasons.push(`中等問題 ${len} 字`); }
  else { score += 2; reasons.push(`短問題 ${len} 字`); }

  // code block
  const hasCode = CODE_PATTERNS.some((re) => re.test(q));
  if (hasCode) { score += 25; reasons.push("含 code"); }
  if (input.hasCodeContext) { score += 10; reasons.push("有 lesson code 上下文"); }

  // 關鍵字
  let proHit = 0, midHit = 0, cheapHit = 0;
  for (const k of PRO_KEYWORDS) if (q.includes(k)) proHit++;
  for (const k of MID_KEYWORDS) if (q.includes(k)) midHit++;
  for (const k of CHEAP_KEYWORDS) if (q.includes(k)) cheapHit++;
  if (proHit > 0) { score += 25 * proHit; reasons.push(`pro 關鍵字 ${proHit}`); }
  if (midHit > 0) { score += 8 * midHit; reasons.push(`mid 關鍵字 ${midHit}`); }
  if (cheapHit > 0 && proHit === 0) { score -= 10; reasons.push(`cheap 關鍵字 ${cheapHit}`); }

  // follow-up（非首訊）→ 上下文已建立、可降一級
  if (!input.isFirstMessage) { score -= 8; reasons.push("非首次對話"); }

  // 用戶等級低、又沒 pro hint → 省點用 cheap
  if ((input.userLevel ?? 1) < 5 && proHit === 0 && !hasCode) {
    score -= 10;
    reasons.push("新手用戶、降級");
  }

  score = Math.max(0, Math.min(100, score));

  let tier: ModelTier;
  if (score >= 55) tier = "pro";
  else if (score >= 25) tier = "mid";
  else tier = "cheap";

  return { tier, score, reasons };
}

/**
 * 在後台 ai_models 表選同 tier 內最便宜 / 效能最好的那一個。
 * 給呼叫端：傳整張 ai_models 進來、回 model id（或 null）。
 */
export function pickModelByTier(
  models: Array<{ id: string; provider: string; model_name: string; tier?: string | null; is_active: boolean }>,
  tier: ModelTier
): { id: string; model_name: string } | null {
  const candidates = models.filter((m) => m.is_active && (m.tier ?? tierFromName(m.model_name)) === tier);
  if (candidates.length === 0) return null;
  return { id: candidates[0].id, model_name: candidates[0].model_name };
}

function tierFromName(name: string): ModelTier {
  const n = name.toLowerCase();
  if (n.includes("opus") || n.includes("gpt-4o") && !n.includes("mini") || n.includes("ultra") || n.includes("o1")) return "pro";
  if (n.includes("sonnet") || n.includes("flash") && !n.includes("8b") || n.includes("70b") || n.includes("gpt-4")) return "mid";
  return "cheap";
}
