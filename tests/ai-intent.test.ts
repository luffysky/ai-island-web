import { describe, it, expect } from "vitest";
import { classifyIntent, assembleContext } from "@/lib/ai-intent";
import { PROMPT_CACHE_MARKER } from "@/lib/ai-providers";

describe("classifyIntent — buckets sample phrases sensibly", () => {
  const cases: [string, string][] = [
    ["為什麼天空是藍色的？", "question"],
    ["幫我寫一個 React 元件", "create"],
    ["好累，好想放棄，撐不住了", "encourage"],
    ["幫我批改這段程式碼，哪裡有錯", "grade"],
    ["把這句翻譯成英文", "translate"],
    ["幫我把這篇文章做重點整理", "summarize"],
    ["嗨", "chitchat"],
  ];
  for (const [text, expected] of cases) {
    it(`"${text}" → ${expected}`, () => {
      expect(classifyIntent(text).intent).toBe(expected);
    });
  }

  it("neutral input with no keyword hits reports low (0.25) confidence", () => {
    const r = classifyIntent("xyzzy plugh foobar qux"); // longer than 6, no keyword hits
    expect(r.confidence).toBeCloseTo(0.25, 6);
    expect(Object.values(r.scores).every((v) => v === 0)).toBe(true);
  });

  it("a very short empty-ish input is treated as chitchat", () => {
    expect(classifyIntent("").intent).toBe("chitchat");
  });

  it("returns confidence in [0,1] and a full scores map", () => {
    const r = classifyIntent("為什麼會這樣？");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(Object.keys(r.scores).sort()).toEqual(
      ["chitchat", "create", "encourage", "grade", "question", "summarize", "translate"].sort(),
    );
  });

  it("grade outranks chitchat when both could match (priority tie-break)", () => {
    // 含 review 關鍵字 → grade 應勝出、不被 chitchat 蓋掉
    expect(classifyIntent("review 一下我的 code 對不對").intent).toBe("grade");
  });
});

describe("assembleContext", () => {
  it("inserts the prompt-cache marker between stable prefix and personalized suffix", () => {
    const out = assembleContext({ persona: "你是綠寶", task: "解釋遞迴" });
    expect(out).toContain(PROMPT_CACHE_MARKER);
    expect(out.indexOf("你是綠寶")).toBeLessThan(out.indexOf(PROMPT_CACHE_MARKER));
    expect(out).toContain("【本次任務】");
  });

  it("omits the marker when cacheBoundary is false", () => {
    const out = assembleContext({ persona: "P", task: "T", cacheBoundary: false });
    expect(out).not.toContain(PROMPT_CACHE_MARKER);
  });

  it("returns just the prefix when there is no suffix", () => {
    expect(assembleContext({ persona: "只有前綴" })).toBe("只有前綴");
  });

  it("renders userSettings object into bullet lines", () => {
    const out = assembleContext({ persona: "P", userSettings: { 語氣: "溫柔", 程度: "初學" } });
    expect(out).toContain("使用者偏好設定");
    expect(out).toContain("- 語氣：溫柔");
  });
});
