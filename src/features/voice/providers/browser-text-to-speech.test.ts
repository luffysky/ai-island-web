import { describe, it, expect } from "vitest";
import { chunkForSpeech } from "./browser-text-to-speech";

describe("chunkForSpeech", () => {
  it("短文不切", () => {
    expect(chunkForSpeech("今天天氣不錯。")).toEqual(["今天天氣不錯。"]);
  });
  it("在句末標點後切、每段不超過上限", () => {
    const text = "第一句話。".repeat(60); // 遠超 160
    const chunks = chunkForSpeech(text, 60);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(60);
    // 合回去等於原文（去空白）
    expect(chunks.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });
  it("沒有標點的超長句也會硬切", () => {
    const text = "阿".repeat(500);
    const chunks = chunkForSpeech(text, 100);
    expect(chunks.length).toBeGreaterThanOrEqual(5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(100);
  });
  it("空字串 → 空陣列", () => {
    expect(chunkForSpeech("")).toEqual([]);
    expect(chunkForSpeech("   ")).toEqual([]);
  });
});
