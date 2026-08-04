import { describe, it, expect } from "vitest";
import { matchSiteFeatures } from "./tools";

describe("matchSiteFeatures", () => {
  it("關鍵字命中對應功能頁", () => {
    expect(matchSiteFeatures("運勢").some((f) => f.path === "/fortune")).toBe(true);
    expect(matchSiteFeatures("八字").some((f) => f.path === "/fortune")).toBe(true);
    expect(matchSiteFeatures("加薪怎麼說").some((f) => f.path === "/message-coach")).toBe(true);
    expect(matchSiteFeatures("辭典").some((f) => f.path === "/dictionary")).toBe(true);
  });
  it("空字串 → 空陣列；無關鍵字 → 不亂配", () => {
    expect(matchSiteFeatures("")).toEqual([]);
    expect(matchSiteFeatures("   ")).toEqual([]);
    expect(matchSiteFeatures("完全不相關的火星文zzzz")).toEqual([]);
  });
  it("回傳含 title 與站內 path", () => {
    const r = matchSiteFeatures("分身");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]).toHaveProperty("title");
    expect(r[0].path.startsWith("/")).toBe(true);
  });
});
