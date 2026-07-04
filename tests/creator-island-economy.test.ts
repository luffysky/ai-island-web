import { describe, it, expect } from "vitest";
import { computeZCharge } from "@/lib/creator-engine/ai/cost";
import { normalizeForDedup } from "@/lib/creator-engine/fragments";

describe("Cost Manager — computeZCharge（E10 嚴格）", () => {
  it("核心動作免費（凝聚/文化轉譯/DNA/顧問/教練）", () => {
    expect(computeZCharge("synthesize", { fragmentIds: ["a", "b"] })).toBe(0);
    expect(computeZCharge("transcreate", {})).toBe(0);
    expect(computeZCharge("dna", {})).toBe(0);
    expect(computeZCharge("advise", {})).toBe(0);
    expect(computeZCharge("coach", {})).toBe(0);
  });

  it("演化 ≤6 免費、>6 每多一個 +1 Z（大量生成）", () => {
    expect(computeZCharge("evolve", { count: 6 })).toBe(0);
    expect(computeZCharge("evolve", { count: 7 })).toBe(1);
    expect(computeZCharge("evolve", { count: 12 })).toBe(6);
    expect(computeZCharge("evolve", { count: 0 })).toBe(0);
  });

  it("編織歌曲（Suno/MV 商用導出）收 10 Z；其他文體免費", () => {
    expect(computeZCharge("compose", { workType: "song" })).toBe(10);
    expect(computeZCharge("compose", { workType: "article" })).toBe(0);
    expect(computeZCharge("compose", {})).toBe(0);
  });

  it("空/未知輸入不炸、回 0", () => {
    expect(computeZCharge("evolve", undefined)).toBe(0);
    expect(computeZCharge("compose", null)).toBe(0);
    expect(computeZCharge("assist", {})).toBe(0);
  });
});

describe("碎片去重 — normalizeForDedup", () => {
  it("去頭尾/收斂空白/小寫/去尾標點 → 視為同一顆", () => {
    expect(normalizeForDedup("  Hello  World  ")).toBe("hello world");
    expect(normalizeForDedup("下雨的城市。")).toBe(normalizeForDedup("下雨的城市"));
    expect(normalizeForDedup("A Idea!")).toBe(normalizeForDedup("a idea"));
    expect(normalizeForDedup("再見？")).toBe(normalizeForDedup("再見"));
  });

  it("不同內容 → 不同 key", () => {
    expect(normalizeForDedup("貓")).not.toBe(normalizeForDedup("狗"));
  });

  it("空字串/純空白安全", () => {
    expect(normalizeForDedup("")).toBe("");
    expect(normalizeForDedup("   ")).toBe("");
  });
});
