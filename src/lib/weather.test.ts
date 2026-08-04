import { describe, it, expect } from "vitest";
import { weatherCodeToText, weatherEmoji, parseForecast, deterministicAdvice, buildWeatherAdvicePrompt, type DailyWeather } from "./weather";

describe("weatherEmoji", () => {
  it("代碼 → emoji", () => {
    expect(weatherEmoji(0)).toBe("☀️");
    expect(weatherEmoji(3)).toBe("☁️");
    expect(weatherEmoji(65)).toBe("🌧️");
    expect(weatherEmoji(95)).toBe("⛈️");
    expect(weatherEmoji(999)).toBe("🌡️");
  });
});

describe("weatherCodeToText", () => {
  it("WMO 代碼 → 中文，未知回多雲", () => {
    expect(weatherCodeToText(0)).toBe("晴天");
    expect(weatherCodeToText(65)).toBe("大雨");
    expect(weatherCodeToText(95)).toBe("雷雨");
    expect(weatherCodeToText(1234)).toBe("多雲");
  });
});

describe("parseForecast", () => {
  it("Open-Meteo daily JSON → 結構化", () => {
    const w = parseForecast({
      daily: {
        time: ["2026-08-05"], weather_code: [63], temperature_2m_max: [31.4],
        temperature_2m_min: [22.1], precipitation_probability_max: [70], uv_index_max: [9],
      },
    })!;
    expect(w.date).toBe("2026-08-05");
    expect(w.desc).toBe("中雨");
    expect(w.tempMax).toBe(31);
    expect(w.tempMin).toBe(22);
    expect(w.tempRange).toBe(9);
    expect(w.precipProb).toBe(70);
    expect(w.uvMax).toBe(9);
  });
  it("壞資料 → null", () => {
    expect(parseForecast(null)).toBeNull();
    expect(parseForecast({ daily: { time: [] } })).toBeNull();
    expect(parseForecast({})).toBeNull();
  });
});

describe("deterministicAdvice", () => {
  const base: DailyWeather = { date: "2026-08-05", code: 0, desc: "晴天", tempMax: 26, tempMin: 22, tempRange: 4, precipProb: 10, uvMax: 3 };
  it("高降雨→帶傘、高溫→補水、大溫差→洋蔥、高紫外線→防曬", () => {
    expect(deterministicAdvice({ ...base, precipProb: 70 }).some((t) => t.includes("帶傘"))).toBe(true);
    expect(deterministicAdvice({ ...base, tempMax: 33 }).some((t) => t.includes("炎熱"))).toBe(true);
    expect(deterministicAdvice({ ...base, tempMin: 8, tempRange: 4 }).some((t) => t.includes("外套"))).toBe(true);
    expect(deterministicAdvice({ ...base, tempRange: 10 }).some((t) => t.includes("溫差"))).toBe(true);
    expect(deterministicAdvice({ ...base, uvMax: 9 }).some((t) => t.includes("防曬") || t.includes("紫外線"))).toBe(true);
  });
  it("好天氣→適合戶外；永遠至少一句", () => {
    expect(deterministicAdvice(base).some((t) => t.includes("適合") || t.includes("good"))).toBe(true);
    expect(deterministicAdvice(base).length).toBeGreaterThan(0);
  });
});

describe("buildWeatherAdvicePrompt", () => {
  it("含天氣數據、system 有醫療護欄", () => {
    const p = buildWeatherAdvicePrompt({ date: "2026-08-05", code: 3, desc: "陰天", tempMax: 28, tempMin: 20, tempRange: 8, precipProb: 40, uvMax: 6, place: "台北" });
    expect(p.user).toContain("陰天");
    expect(p.user).toContain("台北");
    expect(p.system).toContain("醫療");
  });
});
