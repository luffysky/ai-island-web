import { describe, it, expect } from "vitest";
import { TAROT_DECK, drawCards, describeDraw, SUIT_ZH } from "./tarot";

describe("TAROT_DECK", () => {
  it("剛好 78 張（22 大 + 56 小）", () => {
    expect(TAROT_DECK).toHaveLength(78);
    expect(TAROT_DECK.filter((c) => c.arcana === "major")).toHaveLength(22);
    expect(TAROT_DECK.filter((c) => c.arcana === "minor")).toHaveLength(56);
  });
  it("id 全域唯一、每張有正逆位關鍵字", () => {
    expect(new Set(TAROT_DECK.map((c) => c.id)).size).toBe(78);
    for (const c of TAROT_DECK) {
      expect(c.name.trim()).toBeTruthy();
      expect(c.upright.length).toBeGreaterThan(0);
      expect(c.reversed.length).toBeGreaterThan(0);
    }
  });
  it("四花色各 14 張", () => {
    for (const suit of Object.keys(SUIT_ZH)) {
      expect(TAROT_DECK.filter((c) => c.suit === suit)).toHaveLength(14);
    }
  });
});

describe("drawCards", () => {
  it("抽 n 張不重複", () => {
    const d = drawCards(3);
    expect(d).toHaveLength(3);
    expect(new Set(d.map((x) => x.card.id)).size).toBe(3);
  });
  it("可注入亂數（決定論）", () => {
    let calls = 0;
    const seq = [0, 0.9, 0.2, 0.1, 0.5, 0.6]; // idx, reversed?, ...
    const rand = () => seq[calls++ % seq.length];
    const d = drawCards(1, rand);
    expect(d[0].card.id).toBe(TAROT_DECK[0].id);
    expect(typeof d[0].reversed).toBe("boolean");
  });
  it("n 超過牌庫上限會被夾住", () => {
    expect(drawCards(999)).toHaveLength(78);
    expect(drawCards(0).length).toBeGreaterThanOrEqual(1);
  });
});

describe("describeDraw", () => {
  it("含牌名/正逆位/關鍵字", () => {
    const text = describeDraw([{ card: TAROT_DECK[0], reversed: false }]);
    expect(text).toContain(TAROT_DECK[0].name);
    expect(text).toContain("正位");
    expect(text).toContain("關鍵字");
  });
});
