/**
 * RFM 模型 — Recency × Frequency × Monetary 三維評分。
 * 應用於 churn 預警 / 使用者分層 / 自動行銷。
 *
 * 在 AI 島語境：
 *  - Recency = 距上次活躍幾天（小 = 好）
 *  - Frequency = 近 90 天有效活躍天數（heatmap 上的綠格）
 *  - Monetary = 累計付款 ＋ z 幣消費（替代品、學習投入度）
 *
 * 每維 1-5 分（quintile）、總分 RFM 字串如 "555"、churn risk = (6-R)/5。
 */

export type RfmInput = {
  user_id: string;
  recencyDays: number | null;   // null → 從沒活過、視為最大
  frequency90: number;          // 近 90 天活躍日數 0-90
  monetary: number;             // 累計付款 + zcoin spend
};

export type RfmScored = RfmInput & {
  r: 1 | 2 | 3 | 4 | 5;
  f: 1 | 2 | 3 | 4 | 5;
  m: 1 | 2 | 3 | 4 | 5;
  rfm: string;                   // e.g. "535"
  segment: RfmSegment;
  churnRisk: number;             // 0 (安全) - 1 (高危)
};

export type RfmSegment =
  | "champion"     // 555 / 554 / 544 / 545 — 死忠
  | "loyal"        // R ≥ 4, F ≥ 4
  | "potential"    // R ≥ 4, F ≤ 3
  | "new"          // R = 5, F = 1
  | "at_risk"      // R ≤ 3, F ≥ 3
  | "cant_lose"    // R ≤ 2, F ≥ 4, M ≥ 4
  | "hibernating"  // R ≤ 2, F ≤ 2
  | "lost";        // R = 1, F ≤ 2

/**
 * 把一組原始值切 quintile（5 等分）、回傳每筆的 1-5 分。
 * Recency 反向（越小越好）；F、M 正向。
 */
function quintile(values: number[], reverse = false): Map<number, 1 | 2 | 3 | 4 | 5> {
  const m = new Map<number, 1 | 2 | 3 | 4 | 5>();
  if (values.length === 0) return m;
  const sorted = [...values].sort((a, b) => a - b);
  // 4 個切點切 5 段
  const cuts = [0.2, 0.4, 0.6, 0.8].map((p) => sorted[Math.floor(p * sorted.length)]);
  for (const v of values) {
    let bucket: 1 | 2 | 3 | 4 | 5 = 1;
    if (v > cuts[3]) bucket = 5;
    else if (v > cuts[2]) bucket = 4;
    else if (v > cuts[1]) bucket = 3;
    else if (v > cuts[0]) bucket = 2;
    if (reverse) bucket = (6 - bucket) as 1 | 2 | 3 | 4 | 5;
    m.set(v, bucket);
  }
  return m;
}

export function scoreRfm(inputs: RfmInput[]): RfmScored[] {
  if (inputs.length === 0) return [];

  const rVals = inputs.map((x) => x.recencyDays ?? 365);
  const fVals = inputs.map((x) => x.frequency90);
  const mVals = inputs.map((x) => x.monetary);

  const rMap = quintile(rVals, true);  // recency 小 → 5
  const fMap = quintile(fVals, false);
  const mMap = quintile(mVals, false);

  return inputs.map((x) => {
    const r = rMap.get(x.recencyDays ?? 365) ?? 1;
    const f = fMap.get(x.frequency90) ?? 1;
    const m = mMap.get(x.monetary) ?? 1;
    return {
      ...x,
      r,
      f,
      m,
      rfm: `${r}${f}${m}`,
      segment: classify(r, f, m),
      churnRisk: (6 - r) / 5,
    };
  });
}

function classify(r: number, f: number, m: number): RfmSegment {
  if (r >= 4 && f >= 4 && m >= 4) return "champion";
  if (r >= 4 && f >= 4) return "loyal";
  if (r === 5 && f <= 1) return "new";
  if (r >= 4 && f <= 3) return "potential";
  if (r <= 2 && f >= 4 && m >= 4) return "cant_lose";
  if (r <= 3 && f >= 3) return "at_risk";
  if (r === 1 && f <= 2) return "lost";
  return "hibernating";
}

export const SEGMENT_LABEL: Record<RfmSegment, string> = {
  champion: "🏆 死忠",
  loyal: "💚 忠誠",
  potential: "🌱 潛力",
  new: "✨ 新人",
  at_risk: "⚠️ 風險中",
  cant_lose: "🆘 不能丟",
  hibernating: "🌙 沉睡",
  lost: "💀 流失",
};

export const SEGMENT_COLOR: Record<RfmSegment, string> = {
  champion: "bg-emerald-500/20 text-emerald-300",
  loyal: "bg-green-500/20 text-green-300",
  potential: "bg-cyan-500/20 text-cyan-300",
  new: "bg-blue-500/20 text-blue-300",
  at_risk: "bg-yellow-500/20 text-yellow-300",
  cant_lose: "bg-orange-500/20 text-orange-300",
  hibernating: "bg-purple-500/20 text-purple-300",
  lost: "bg-red-500/20 text-red-300",
};
