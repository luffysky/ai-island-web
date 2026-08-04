import { describe, it, expect } from "vitest";
import { moonPhase } from "./moon";

describe("moonPhase", () => {
  it("已知新月附近 → 新月", () => {
    const p = moonPhase(Date.UTC(2000, 0, 6, 18, 14));
    expect(p.name).toBe("新月");
    expect(p.illum).toBeLessThan(10);
  });
  it("約半個週期後 → 滿月、照亮接近 100", () => {
    const p = moonPhase(Date.UTC(2000, 0, 6, 18, 14) + 14.77 * 86400000);
    expect(p.name).toBe("滿月");
    expect(p.illum).toBeGreaterThan(90);
  });
  it("永遠回傳合法相位 + 0..100 照亮", () => {
    for (let d = 0; d < 30; d++) {
      const p = moonPhase(Date.UTC(2026, 7, 1) + d * 86400000);
      expect(p.emoji).toMatch(/🌑|🌒|🌓|🌔|🌕|🌖|🌗|🌘/);
      expect(p.illum).toBeGreaterThanOrEqual(0);
      expect(p.illum).toBeLessThanOrEqual(100);
    }
  });
});
