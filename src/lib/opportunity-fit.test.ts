import { describe, it, expect } from "vitest";
import { scoreOpportunity } from "./opportunity-fit";

const NOW = Date.parse("2026-07-13T00:00:00Z");

describe("scoreOpportunity", () => {
  it("免費 + AI 主題 + 免上台 → 高分", () => {
    const r = scoreOpportunity({ name: "AI 創新黑客松", category: "AI", is_free: true, requires_pitch: false, application_deadline: "2026-08-15" }, NOW);
    expect(r.score).toBeGreaterThan(50);
    expect(r.reasons).toContain("免報名費");
  });

  it("限學生 → 進 blockers 且大扣分", () => {
    const r = scoreOpportunity({ name: "大學生 AI 賽", category: "AI", is_free: true, requires_student: true, application_deadline: "2026-09-01" }, NOW);
    expect(r.blockers).toContain("限學生");
    const noStudent = scoreOpportunity({ name: "大學生 AI 賽", category: "AI", is_free: true, application_deadline: "2026-09-01" }, NOW);
    expect(noStudent.score - r.score).toBe(40);
  });

  it("已截止 → 大扣分 + blocker", () => {
    const r = scoreOpportunity({ name: "AI 賽", category: "AI", application_deadline: "2026-07-01" }, NOW);
    expect(r.blockers).toContain("已截止");
    expect(r.score).toBeLessThan(0);
  });

  it("百萬獎金加最多分", () => {
    const big = scoreOpportunity({ name: "x", prize_amount: 2_000_000, application_deadline: "2026-08-20" }, NOW);
    const small = scoreOpportunity({ name: "x", prize_amount: 60_000, application_deadline: "2026-08-20" }, NOW);
    expect(big.score).toBeGreaterThan(small.score);
    expect(big.reasons).toContain("百萬級獎金");
  });

  it("無關主題 + 收費 + 需上台 → 低分", () => {
    const r = scoreOpportunity({ name: "傳統書法比賽", category: "藝術", is_free: false, requires_pitch: true, application_deadline: "2026-08-20" }, NOW);
    expect(r.score).toBeLessThan(20);
  });
});
