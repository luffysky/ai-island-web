/**
 * 兩比例 z-test — 算 A/B 變體轉換率差是否顯著。
 * 用 normal approximation、雙尾 p。
 */
export function twoProportionZTest(
  controlConversions: number,
  controlTotal: number,
  variantConversions: number,
  variantTotal: number
): { p: number; z: number; significant: boolean; uplift: number } {
  if (controlTotal === 0 || variantTotal === 0) {
    return { p: 1, z: 0, significant: false, uplift: 0 };
  }
  const p1 = controlConversions / controlTotal;
  const p2 = variantConversions / variantTotal;
  const p = (controlConversions + variantConversions) / (controlTotal + variantTotal);
  const se = Math.sqrt(p * (1 - p) * (1 / controlTotal + 1 / variantTotal));
  if (se === 0) return { p: 1, z: 0, significant: false, uplift: 0 };
  const z = (p2 - p1) / se;
  const pVal = 2 * (1 - normalCdf(Math.abs(z)));
  return {
    p: pVal,
    z,
    significant: pVal < 0.05,
    uplift: p1 === 0 ? 0 : (p2 - p1) / p1,
  };
}

// Abramowitz & Stegun 26.2.17 — 簡易 CDF approximation
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (
    0.3193815 +
    t * (-0.3565638 +
      t * (1.781478 +
        t * (-1.821256 +
          t * 1.330274)))
  );
  return x > 0 ? 1 - prob : prob;
}
