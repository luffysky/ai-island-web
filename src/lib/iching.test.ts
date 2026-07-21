import { describe, it, expect } from "vitest";
import { castGua, parseGuaReading } from "./iching";

describe("castGua", () => {
  it("起卦結果完整、決定論（同 seed 同問同卦）", () => {
    const a = castGua("u1|2026-07-22", "工作");
    const b = castGua("u1|2026-07-22", "工作");
    expect(a.name).toBe(b.name);
    expect(a).toMatchObject({ name: expect.any(String), meaning: expect.any(String), upper: expect.any(String), lower: expect.any(String), movingYao: expect.any(String) });
    expect(a.name).not.toBe("未知卦"); // 64 卦表齊全、必命中
  });
  it("不同提問 → 通常不同卦（一事一卦）", () => {
    const names = new Set(["工作", "感情", "財運", "健康", "搬家"].map((q) => castGua("u1|2026-07-22", q).name));
    expect(names.size).toBeGreaterThan(1);
  });
  it("動爻在初~上之間", () => {
    for (const q of ["a", "b", "c", "d", "e"]) {
      expect(["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"]).toContain(castGua("s", q).movingYao);
    }
  });
});

describe("parseGuaReading", () => {
  it("解析 + 缺 advice 補 fallback", () => {
    const r = parseGuaReading('{"summary":"這卦在講耐心等待"}');
    expect(r?.summary).toContain("耐心");
    expect(r?.advice).toBeTruthy();
  });
  it("壞輸入回 null", () => {
    expect(parseGuaReading("不是 JSON")).toBeNull();
    expect(parseGuaReading('{"advice":"只有這個"}')).toBeNull();
  });
});
