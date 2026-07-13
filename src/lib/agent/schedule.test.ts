import { describe, it, expect } from "vitest";
import { computeNextRun, describeSchedule } from "./schedule";

const TW = 8 * 3600_000;
// 把 UTC 瞬間讀成「台灣牆上時鐘」
const twParts = (iso: string) => {
  const d = new Date(Date.parse(iso) + TW);
  return { dow: d.getUTCDay(), hour: d.getUTCHours(), min: d.getUTCMinutes() };
};

describe("computeNextRun", () => {
  it("daily：回傳的是台灣時間指定的整點", () => {
    const from = Date.parse("2026-07-13T00:00:00Z"); // = 台灣 07-13 08:00
    const next = computeNextRun("daily", 9, null, from);
    const p = twParts(next);
    expect(p.hour).toBe(9);
    expect(p.min).toBe(0);
    // 未來、且 24h 內
    expect(Date.parse(next)).toBeGreaterThan(from);
    expect(Date.parse(next) - from).toBeLessThanOrEqual(24 * 3600_000);
  });

  it("daily：指定時間已過 → 推到明天同一時間", () => {
    const from = Date.parse("2026-07-13T02:00:00Z"); // = 台灣 07-13 10:00（已過 9 點）
    const next = computeNextRun("daily", 9, null, from);
    expect(twParts(next).hour).toBe(9);
    // 9am TW = 1am UTC 隔天
    expect(next).toBe("2026-07-14T01:00:00.000Z");
  });

  it("daily：9am 台灣 = 1am UTC", () => {
    const from = Date.parse("2026-07-12T20:00:00Z"); // 台灣 07-13 04:00
    expect(computeNextRun("daily", 9, null, from)).toBe("2026-07-13T01:00:00.000Z");
  });

  it("weekly：落在指定星期幾的指定整點、且 7 天內", () => {
    const from = Date.parse("2026-07-13T00:00:00Z");
    const next = computeNextRun("weekly", 20, 3, from); // 每週三 20:00 台灣
    const p = twParts(next);
    expect(p.dow).toBe(3);
    expect(p.hour).toBe(20);
    expect(Date.parse(next)).toBeGreaterThan(from);
    expect(Date.parse(next) - from).toBeLessThanOrEqual(7 * 24 * 3600_000 + 1);
  });

  it("clamp：超範圍的 hour/weekday 會被夾住、不炸", () => {
    const from = Date.parse("2026-07-13T00:00:00Z");
    expect(() => computeNextRun("daily", 99, null, from)).not.toThrow();
    expect(twParts(computeNextRun("daily", 99, null, from)).hour).toBe(23);
  });
});

describe("describeSchedule", () => {
  it("daily / weekly 人話", () => {
    expect(describeSchedule("daily", 9, null)).toBe("每天 09:00");
    expect(describeSchedule("weekly", 20, 3)).toBe("每週三 20:00");
    expect(describeSchedule("weekly", 8, 0)).toBe("每週日 08:00");
  });
});
