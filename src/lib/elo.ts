/**
 * 演算法 #7 — ELO 自適應題目難度
 *
 * 每個用戶有 user_rating（預設 1200），每題有 question_rating（預設 1200）。
 * 用戶答題後：
 *  - 答對 score = 1、答錯 score = 0
 *  - expected = 1 / (1 + 10^((qR - uR) / 400))
 *  - userNew = uR + K * (score - expected)
 *  - qNew    = qR + K * ((1-score) - (1-expected))  ← 對稱
 *  - K 動態：新題 K=32、活躍題 K=16、權威題 K=8
 *
 * 出題：找 ratings within user.rating ± 80 的題目隨機抽。
 * 若不足、退而求其次擴大範圍。
 */

export const ELO_DEFAULT = 1200;

export function expectedScore(userR: number, qR: number): number {
  return 1 / (1 + Math.pow(10, (qR - userR) / 400));
}

export function updateElo(
  userR: number,
  qR: number,
  won: boolean,
  k: number = 24,
): { userR: number; qR: number; delta: number } {
  const expected = expectedScore(userR, qR);
  const score = won ? 1 : 0;
  const delta = k * (score - expected);
  return {
    userR: Math.max(400, Math.round(userR + delta)),
    qR: Math.max(400, Math.round(qR - delta)),
    delta: Math.round(delta * 10) / 10,
  };
}

/**
 * 出題：給 userR，從一堆題裡挑 rating 接近的 N 題
 * 階段擴大：±80 → ±150 → ±300 → all
 */
export function pickQuestions<T extends { rating?: number | null }>(
  pool: T[],
  userR: number,
  n: number = 5,
): T[] {
  const ranges = [80, 150, 300, Infinity];
  for (const r of ranges) {
    const cands = pool.filter((p) => {
      const pr = p.rating ?? ELO_DEFAULT;
      return Math.abs(pr - userR) <= r;
    });
    if (cands.length >= n) {
      // 在範圍內隨機抽 n 個
      const shuffled = [...cands].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, n);
    }
    if (r === Infinity && cands.length > 0) return cands.slice(0, n);
  }
  return [];
}

/**
 * K factor 隨題目被答過次數調整：
 *  - < 30 次 → 32（新題、Rating 不穩、大調整）
 *  - 30-200  → 16
 *  - > 200   → 8（已穩定）
 */
export function dynamicK(attempts: number): number {
  if (attempts < 30) return 32;
  if (attempts < 200) return 16;
  return 8;
}
