/**
 * 2.7.3 Diff 只讀變動——同一個任務裡若「重讀」一個先前讀過的資源（同 URL/檔案），且內容幾乎相同，
 * 就只把「變動的部分」餵回 LLM，而不是把整份內容再塞一次 history（省 token）。
 * 純函式、可單元測試；orchestrator 在 read 類工具成功後套用（任何情況都可安全退回完整內容）。
 */

/** 從工具結果 data 取出可比對的主要文字。取不到就回空字串（→ 不做 diff）。 */
export function extractReadText(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data;
  const d = data as any;
  if (typeof d.text === "string") return d.text;
  if (typeof d.content === "string") return d.content;
  if (typeof d.body === "string") return d.body;
  try { return JSON.stringify(d); } catch { return ""; }
}

/** 從工具名 + 參數推出「資源鍵」（同資源才比對）。無可辨識資源 → null（不做 diff）。 */
export function resourceKeyOf(toolName: string, args: any): string | null {
  const r = args?.url ?? args?.path ?? args?.file ?? args?.query ?? args?.topic ?? args?.q;
  if (typeof r === "string" && r.trim()) return `${toolName}:${r.trim().slice(0, 200)}`;
  return null;
}

function lines(s: string): string[] {
  return s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/**
 * 比對「先前讀到的 prev」與「這次讀到的 next」：
 * - 內容太短、或差異大（重疊 < 0.9）→ { reduced:false, text:next }（照常送完整）。
 * - 幾乎相同（重疊 ≥ 0.9）→ { reduced:true, text:精簡差異說明 }（省 token）。
 */
export function diffOrFull(prev: string, next: string, opts: { minLen?: number; sameThreshold?: number } = {}): { reduced: boolean; text: string } {
  const minLen = opts.minLen ?? 400;
  const th = opts.sameThreshold ?? 0.9;
  if (!prev || !next || next.length < minLen) return { reduced: false, text: next };

  const prevLines = lines(prev);
  const nextLines = lines(next);
  if (nextLines.length === 0) return { reduced: false, text: next };

  const prevSet = new Set(prevLines);
  const nextSet = new Set(nextLines);
  const sameCount = nextLines.filter((l) => prevSet.has(l)).length;
  const overlap = sameCount / nextLines.length;
  if (overlap < th) return { reduced: false, text: next };

  const added = nextLines.filter((l) => !prevSet.has(l)).slice(0, 8);
  const removed = prevLines.filter((l) => !nextSet.has(l)).slice(0, 8);
  const parts = ["（這個資源與你先前讀到的幾乎相同，內容不再重貼、只列變動以省 token）"];
  if (added.length) parts.push("新增/不同：\n" + added.map((l) => `+ ${l.slice(0, 120)}`).join("\n"));
  if (removed.length) parts.push("消失：\n" + removed.map((l) => `- ${l.slice(0, 120)}`).join("\n"));
  if (!added.length && !removed.length) parts.push("內容與上次完全一致。");
  return { reduced: true, text: parts.join("\n\n").slice(0, 1500) };
}
