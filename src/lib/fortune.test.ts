import { describe, it, expect } from "vitest";
import { zodiacFromBirthDate, parseFortune } from "./fortune";

describe("zodiacFromBirthDate", () => {
  it("各星座邊界正確", () => {
    expect(zodiacFromBirthDate("2000-03-21")).toBe("aries");   // 牡羊起點
    expect(zodiacFromBirthDate("2000-04-19")).toBe("aries");   // 牡羊尾
    expect(zodiacFromBirthDate("2000-04-20")).toBe("taurus");  // 金牛起點
    expect(zodiacFromBirthDate("2000-07-22")).toBe("cancer");  // 巨蟹尾
    expect(zodiacFromBirthDate("2000-07-23")).toBe("leo");     // 獅子起點
    expect(zodiacFromBirthDate("2000-12-21")).toBe("sagittarius");
    expect(zodiacFromBirthDate("2000-12-22")).toBe("capricorn"); // 摩羯起點
  });

  it("跨年摩羯（1月）", () => {
    expect(zodiacFromBirthDate("2001-01-01")).toBe("capricorn");
    expect(zodiacFromBirthDate("2001-01-19")).toBe("capricorn");
    expect(zodiacFromBirthDate("2001-01-20")).toBe("aquarius");
  });

  it("無效輸入回 null", () => {
    expect(zodiacFromBirthDate("")).toBeNull();
    expect(zodiacFromBirthDate("2000/03/21")).toBeNull();
    expect(zodiacFromBirthDate("2000-13-01")).toBeNull();
    expect(zodiacFromBirthDate("2000-03-40")).toBeNull();
  });
});

describe("parseFortune", () => {
  it("解析乾淨 JSON", () => {
    const f = parseFortune('{"overall":"今天不錯","love":"a","career":"b","wealth":"c","luckyColor":"天空藍","luckyNumber":7,"tip":"加油","score":80}');
    expect(f?.overall).toBe("今天不錯");
    expect(f?.luckyNumber).toBe(7);
    expect(f?.score).toBe(80);
  });

  it("容忍 markdown 圍欄與前後雜訊", () => {
    const f = parseFortune('好的\n```json\n{"overall":"穩","luckyNumber":3}\n```\n');
    expect(f?.overall).toBe("穩");
    expect(f?.luckyNumber).toBe(3);
    // 缺欄位有 fallback
    expect(f?.love).toBeTruthy();
    expect(f?.luckyColor).toBeTruthy();
  });

  it("幸運數字越界 → 收斂到 1–9", () => {
    expect(parseFortune('{"overall":"x","luckyNumber":42}')?.luckyNumber).toBeGreaterThanOrEqual(1);
    expect(parseFortune('{"overall":"x","luckyNumber":42}')?.luckyNumber).toBeLessThanOrEqual(9);
    expect(parseFortune('{"overall":"x","luckyNumber":0}')?.luckyNumber).toBe(9);
  });

  it("score 越界 → 丟掉（undefined）", () => {
    expect(parseFortune('{"overall":"x","score":200}')?.score).toBeUndefined();
    expect(parseFortune('{"overall":"x","score":-5}')?.score).toBeUndefined();
  });

  it("沒有 overall / 壞 JSON → null", () => {
    expect(parseFortune('{"love":"只有這個"}')).toBeNull();
    expect(parseFortune("完全不是 JSON")).toBeNull();
    expect(parseFortune("")).toBeNull();
  });
});
