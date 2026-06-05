// 輕量難度分級：給「Auto 模型」用。閒聊→low（便宜快）、一般→mid、程式/架構/深問→high（強模型）。
// 純規則、零成本、零延遲；判錯頂多選到鄰近 tier、不影響正確性。
export type AiTier = "low" | "mid" | "high";

const HARD = /程式|程式碼|\bcode\b|函式|function|class\b|async|await|遞迴|演算法|algorithm|複雜度|big.?o|架構|architecture|設計模式|design pattern|system design|重構|refactor|優化|optimi[sz]|效能|performance|為什麼|原理|底層|機制|debug|錯誤訊息|exception|stack ?trace|編譯|compile|型別|typescript|\bsql\b|資料庫|database|\brls\b|policy|regex|正規表達|並發|concurren|thread|deadlock|race condition|記憶體|memory leak|加密|crypto|證明|推導|時間複雜|空間複雜|api 設計|分散式|distributed|kubernetes|docker|ci\/cd/i;
const EASY = /^(嗨+|哈囉+|你好|妳好|hi+|hello+|嘿+|在嗎|早安|午安|晚安|謝謝|感謝|thank|thx|ok|okay|好的?|收到|讚+|哈+|嗯+|喔+|耶+|掰+|bye+|test|測試)[\s!！。.~、,，?？♡❤️😂🤣👍✨]*$/i;

export function classifyDifficulty(message: string, opts?: { hasImages?: boolean }): AiTier {
  const m = (message || "").trim();
  if (opts?.hasImages) return "high";              // 看圖通常要強模型
  if (!m) return "low";
  if (EASY.test(m)) return "low";
  if (/```/.test(m) || m.length > 280) return "high"; // 帶程式碼 / 長問題
  const hard = (m.match(HARD) || []).length;
  if (hard >= 1) return m.length > 80 ? "high" : "mid";
  if ((m.match(/[?？]/g) || []).length >= 2) return "mid"; // 多重提問
  return m.length > 120 ? "mid" : "low";
}

// tier 欄位沒設時、用成本推回 tier（cost_input_per_1m）
export function tierFromCost(cost: number): AiTier {
  if (cost < 0.5) return "low";
  if (cost < 2) return "mid";
  return "high";
}

/** 從候選模型挑「目標 tier」的最佳模型：high→該層最強、low/mid→該層最省；該層沒有就找鄰近層 */
export function pickModelByTier(models: any[], target: AiTier): any | null {
  if (!models?.length) return null;
  const order: AiTier[] = ["low", "mid", "high"];
  const tierOf = (m: any): AiTier => (m?.tier === "low" || m?.tier === "mid" || m?.tier === "high")
    ? m.tier : tierFromCost(Number(m?.cost_input_per_1m) || 0);
  const ti = order.indexOf(target);
  // 搜尋順序：目標層 → 上一層 → 下一層 → …（保證有東西可選）
  const seq = [ti, ti + 1, ti - 1, ti + 2, ti - 2].filter((i) => i >= 0 && i < 3).map((i) => order[i]);
  for (const t of seq) {
    const cand = models
      .filter((m) => tierOf(m) === t)
      .sort((a, b) => Number(a.cost_input_per_1m) - Number(b.cost_input_per_1m));
    if (cand.length) return target === "high" ? cand[cand.length - 1] : cand[0];
  }
  return models[0];
}
