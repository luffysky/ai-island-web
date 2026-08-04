// 把 Agent 顯示內容轉成「適合朗讀」的純文字（規格 §四）。
// 不朗讀：Markdown 語法、程式碼區塊、超長網址、JSON、工具原始紀錄、system/推理。
// 純函式、可測。回覆過長只回摘要/前段（truncated=true），畫面仍顯示完整內容。

export interface SanitizeResult {
  /** 要朗讀的純文字。 */
  text: string;
  /** 是否因過長而截斷（畫面仍顯示全文）。 */
  truncated: boolean;
}

export interface SanitizeOptions {
  /** 朗讀上限字數，超過就截到句界。預設 500。 */
  maxChars?: number;
}

/** 看起來像一大塊 JSON/工具紀錄的行（不朗讀）。 */
function looksLikeStructuredNoise(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // 純 JSON 物件/陣列行、或 key: {…} 這種
  if (/^[[{].*[\]}],?$/.test(t) && /[":]/.test(t)) return true;
  // 工具紀錄前綴
  if (/^(tool|工具|log|debug|trace|stack|system|assistant|user)\s*[:：]/i.test(t)) return true;
  return false;
}

export function sanitizeTextForSpeech(input: string, options: SanitizeOptions = {}): SanitizeResult {
  const maxChars = options.maxChars ?? 500;
  let s = String(input ?? "");

  // 1) 去掉 fenced code block（```…```）整段
  s = s.replace(/```[\s\S]*?```/g, " ");
  // 2) 去掉行內 code `…`（保留內容但去反引號其實會唸出程式，直接移除較安全）
  s = s.replace(/`[^`]*`/g, " ");
  // 3) 圖片 ![alt](url) → 去掉（不唸 alt/url）
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  // 4) 連結 [文字](url) → 只留文字
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // 5) 逐行處理：丟掉結構化雜訊行
  s = s
    .split(/\r?\n/)
    .filter((line) => !looksLikeStructuredNoise(line))
    .join("\n");
  // 6) 裸網址 → 「連結」（超長網址不唸）
  s = s.replace(/https?:\/\/[^\s)]+/gi, "連結");
  // 7) 去 Markdown 標記符號：#、>、表格 |、粗斜體 * _ ~、清單符號、水平線
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");        // 標題 #
  s = s.replace(/^\s{0,3}>\s?/gm, "");             // 引用 >
  s = s.replace(/^\s*[-*+]\s+/gm, "");             // 清單項目
  s = s.replace(/^\s*\d+\.\s+/gm, "");             // 有序清單
  s = s.replace(/^\s*([-*_])\1{2,}\s*$/gm, " ");   // 水平線 ---
  s = s.replace(/[*_~]{1,3}/g, "");                // 粗斜體/刪除線
  s = s.replace(/\|/g, " ");                        // 表格分隔
  // 8) HTML 標籤殘留
  s = s.replace(/<[^>]+>/g, " ");
  // 9) 壓縮空白
  s = s.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();

  if (s.length <= maxChars) return { text: s, truncated: false };

  // 過長：截到 maxChars 前最後一個句界（。！？.!? 或換行），至少留一半
  const slice = s.slice(0, maxChars);
  const lastBreak = Math.max(
    slice.lastIndexOf("。"), slice.lastIndexOf("！"), slice.lastIndexOf("？"),
    slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"),
    slice.lastIndexOf("\n"),
  );
  const cut = lastBreak >= maxChars * 0.5 ? slice.slice(0, lastBreak + 1) : slice;
  return { text: cut.trim(), truncated: true };
}
