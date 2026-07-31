import { describe, it, expect } from "vitest";
import { isPureGreeting, hasFreshnessIntent } from "./rule-filter";

describe("rule-filter: isPureGreeting", () => {
  it("純招呼/測試字要攔（回 true）", () => {
    for (const g of ["hi", "Hello", "你好", "  嗨嗨  ", "謝謝！", "test", "測試", "ok", "在嗎？", "thanks"]) {
      expect(isPureGreeting(g)).toBe(true);
    }
  });
  it("空白也算沒給任務（true）", () => {
    expect(isPureGreeting("   ")).toBe(true);
    expect(isPureGreeting("")).toBe(true);
  });
  it("夾帶實質任務的不能攔（false）", () => {
    for (const g of [
      "你好，幫我查這週台北會不會下雨",
      "hi 幫我把這段翻成英文",
      "謝謝你剛剛的整理，再幫我做一份簡報",
      "幫我規劃三天兩夜東京行程",
      "測試 API 回傳格式對不對",   // 有實質內容、非純「測試」
    ]) {
      expect(isPureGreeting(g)).toBe(false);
    }
  });
});

describe("rule-filter: hasFreshnessIntent", () => {
  it("時效性字眼要判 true（不做重複快取）", () => {
    for (const g of ["今天的天氣", "現在台積電股價", "最新公告", "這週下雨機率", "報名截止是幾點", "latest news"]) {
      expect(hasFreshnessIntent(g)).toBe(true);
    }
  });
  it("非時效性任務判 false（可做重複快取）", () => {
    for (const g of ["解釋什麼是閉包", "幫我把這段翻成英文", "推薦幾家台北早午餐"]) {
      expect(hasFreshnessIntent(g)).toBe(false);
    }
  });
});
