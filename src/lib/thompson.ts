/**
 * 演算法 #5 — Thompson Sampling 多臂老虎機
 *
 * 替代固定 weight A/B 分配。每個 variant 維護 Beta 分佈 (alpha, beta)：
 *  - alpha = 1 + 成功（conversion）數
 *  - beta  = 1 + 失敗（assigned but no conversion）數
 *
 * 分配時從每個 variant 抽一個 Beta(α, β) 樣本、選最大的 → 自動探索/利用平衡。
 *
 * Pre-condition: caller 已從 ab_assignments + ab_events 聚合出
 *  per-variant assigned / converted 數。
 */

export type ArmStats = {
  key: string;
  assigned: number;
  converted: number;
};

export type AssignDecision = {
  picked: string;
  samples: Record<string, number>;
};

/**
 * 從 Beta(α, β) 抽樣。
 * 用 Marsaglia & Tsang 簡化版：兩個 Gamma 比例。
 * 對小樣本足夠精度、不需要外部 lib。
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

// Marsaglia & Tsang 1998 — k >= 1 適用、k < 1 用 Johnk's 法（簡化）
function sampleGamma(k: number): number {
  if (k < 1) {
    // boost：Γ(k) = Γ(k+1) / k * U^(1/k)
    return sampleGamma(k + 1) * Math.pow(Math.random(), 1 / k);
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (let i = 0; i < 1000; i++) {
    let x: number, v: number;
    do {
      x = sampleNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
  return d; // fallback
}

function sampleNormal(): number {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function thompsonPick(arms: ArmStats[]): AssignDecision {
  if (arms.length === 0) return { picked: "", samples: {} };
  const samples: Record<string, number> = {};
  let bestKey = arms[0].key;
  let bestSample = -1;
  for (const a of arms) {
    const alpha = 1 + a.converted;
    const beta = 1 + (a.assigned - a.converted);
    const s = sampleBeta(alpha, beta);
    samples[a.key] = s;
    if (s > bestSample) {
      bestSample = s;
      bestKey = a.key;
    }
  }
  return { picked: bestKey, samples };
}

/**
 * 期望轉換率（給 UI 顯示）
 */
export function expectedRate(arm: ArmStats): { mean: number; p5: number; p95: number } {
  const alpha = 1 + arm.converted;
  const beta = 1 + (arm.assigned - arm.converted);
  const mean = alpha / (alpha + beta);
  // 簡單近似 95% CI（normal approx）
  const v = (alpha * beta) / ((alpha + beta) * (alpha + beta) * (alpha + beta + 1));
  const sd = Math.sqrt(v);
  return { mean, p5: Math.max(0, mean - 1.96 * sd), p95: Math.min(1, mean + 1.96 * sd) };
}
