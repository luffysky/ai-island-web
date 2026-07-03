import { describe, it, expect } from "vitest";
import { billableInputTokens, estimateCost, stripLoneSurrogates, PROMPT_CACHE_MARKER } from "@/lib/ai-providers";

describe("billableInputTokens — prompt-cache weighting", () => {
  it("plain input is 1x", () => {
    expect(billableInputTokens(1000)).toBe(1000);
  });
  it("cache write is 1.25x and cache read is 0.1x, added to input", () => {
    // 1000 + 200*1.25 + 500*0.1 = 1000 + 250 + 50 = 1300
    expect(billableInputTokens(1000, 200, 500)).toBe(1300);
  });
  it("treats missing/zero args as 0", () => {
    expect(billableInputTokens(0, 0, 0)).toBe(0);
    expect(billableInputTokens(100)).toBe(100);
  });
  it("cache read is much cheaper than an equivalent cache write", () => {
    expect(billableInputTokens(0, 0, 1000)).toBeLessThan(billableInputTokens(0, 1000, 0));
  });
});

describe("estimateCost", () => {
  it("prices per 1M tokens for input+output", () => {
    // 1M input @ $3 + 1M output @ $15 = $18
    expect(estimateCost(1_000_000, 1_000_000, 3, 15)).toBeCloseTo(18, 6);
  });
  it("is zero at zero tokens", () => {
    expect(estimateCost(0, 0, 3, 15)).toBe(0);
  });
});

describe("stripLoneSurrogates", () => {
  it("keeps a valid surrogate pair (full emoji) intact", () => {
    const rocket = "🚀"; // valid surrogate pair
    expect(stripLoneSurrogates(`hi ${rocket}`)).toBe(`hi ${rocket}`);
  });
  it("removes a lone high surrogate (half an emoji from a bad slice)", () => {
    const lone = "abc" + "\uD83D"; // high surrogate with no low
    expect(stripLoneSurrogates(lone)).toBe("abc");
  });
  it("removes a lone low surrogate", () => {
    expect(stripLoneSurrogates("\uDE00xyz")).toBe("xyz");
  });
  it("leaves plain ASCII / CJK untouched", () => {
    expect(stripLoneSurrogates("你好 world")).toBe("你好 world");
  });
});

describe("PROMPT_CACHE_MARKER", () => {
  it("is a run of zero-width spaces (U+200B, invisible, unlikely to occur naturally)", () => {
    expect(PROMPT_CACHE_MARKER.length).toBeGreaterThan(0);
    expect([...PROMPT_CACHE_MARKER].every((c) => c.charCodeAt(0) === 0x200b)).toBe(true);
  });
});
