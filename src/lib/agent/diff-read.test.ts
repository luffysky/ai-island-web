import { describe, it, expect } from "vitest";
import { extractReadText, resourceKeyOf, diffOrFull } from "./diff-read";

describe("extractReadText", () => {
  it("抓 string / .text / .content / fallback JSON", () => {
    expect(extractReadText("hi")).toBe("hi");
    expect(extractReadText({ text: "abc" })).toBe("abc");
    expect(extractReadText({ content: "cc" })).toBe("cc");
    expect(extractReadText({ a: 1 })).toContain("\"a\":1");
    expect(extractReadText(null)).toBe("");
  });
});

describe("resourceKeyOf", () => {
  it("由 url/path/query 推資源鍵；無則 null", () => {
    expect(resourceKeyOf("web.fetch", { url: "https://a.com" })).toBe("web.fetch:https://a.com");
    expect(resourceKeyOf("web.research", { query: "台北 天氣" })).toBe("web.research:台北 天氣");
    expect(resourceKeyOf("calc", { expr: "1+1" })).toBeNull();
  });
});

describe("diffOrFull", () => {
  const base = Array.from({ length: 40 }, (_, i) => `第 ${i} 行內容固定不變的資料`).join("\n");
  it("內容太短 → 不精簡", () => {
    expect(diffOrFull("abc", "def").reduced).toBe(false);
  });
  it("差異大 → 送完整", () => {
    const other = Array.from({ length: 40 }, (_, i) => `完全不同的第 ${i} 行`).join("\n");
    const r = diffOrFull(base, other);
    expect(r.reduced).toBe(false);
    expect(r.text).toBe(other);
  });
  it("幾乎相同（只改幾行）→ 精簡成差異、變短", () => {
    const next = base.replace("第 5 行內容固定不變的資料", "第 5 行改成新的內容了");
    const r = diffOrFull(base, next);
    expect(r.reduced).toBe(true);
    expect(r.text.length).toBeLessThan(next.length);
    expect(r.text).toContain("第 5 行改成新的內容了");
    expect(r.text).toContain("省 token");
  });
  it("完全一致 → 精簡且註明一致", () => {
    const r = diffOrFull(base, base);
    expect(r.reduced).toBe(true);
    expect(r.text).toContain("完全一致");
  });
});
