import { describe, it, expect } from "vitest";
import { sanitizeTextForSpeech } from "./sanitize-text-for-speech";

describe("sanitizeTextForSpeech", () => {
  it("移除程式碼區塊，不朗讀程式", () => {
    const r = sanitizeTextForSpeech("先看這段：\n```python\nprint('hi')\n```\n就這樣。");
    expect(r.text).not.toContain("print");
    expect(r.text).toContain("先看這段");
    expect(r.text).toContain("就這樣");
  });

  it("行內 code 移除", () => {
    expect(sanitizeTextForSpeech("用 `npm run build` 指令").text).not.toContain("npm run build");
  });

  it("連結只留文字、裸網址變「連結」", () => {
    const r = sanitizeTextForSpeech("看 [Python 課程](https://x.com/a/b/c) 或 https://very.long/url/xyz");
    expect(r.text).toContain("Python 課程");
    expect(r.text).not.toContain("https://");
    expect(r.text).toContain("連結");
  });

  it("移除 Markdown 標題/清單/粗體符號", () => {
    const r = sanitizeTextForSpeech("# 標題\n- 項目一\n- 項目二\n**重點**");
    expect(r.text).not.toMatch(/[#*]/);
    expect(r.text).toContain("標題");
    expect(r.text).toContain("項目一");
    expect(r.text).toContain("重點");
  });

  it("丟掉 JSON/工具紀錄行", () => {
    const r = sanitizeTextForSpeech('好的\n{"tool":"web.fetch","ok":true}\ntool: 執行中\n完成');
    expect(r.text).not.toContain("web.fetch");
    expect(r.text).not.toContain("執行中");
    expect(r.text).toContain("好的");
    expect(r.text).toContain("完成");
  });

  it("過長截斷到句界、標 truncated", () => {
    const long = "這是一句完整的話。".repeat(80); // 遠超 500
    const r = sanitizeTextForSpeech(long, { maxChars: 100 });
    expect(r.truncated).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(100);
    expect(r.text.endsWith("。")).toBe(true);
  });

  it("短文字不截斷", () => {
    const r = sanitizeTextForSpeech("今天天氣不錯。");
    expect(r.truncated).toBe(false);
    expect(r.text).toBe("今天天氣不錯。");
  });

  it("空/null 安全", () => {
    expect(sanitizeTextForSpeech("").text).toBe("");
    // @ts-expect-error 測試 null 容錯
    expect(sanitizeTextForSpeech(null).text).toBe("");
  });
});
