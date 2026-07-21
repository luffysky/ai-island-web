import { describe, it, expect } from "vitest";
import { parseCoachVersions, getScenario, getTone, SCENARIOS, TONES } from "./message-coach";

describe("message-coach data", () => {
  it("每個情境 defaultTone 都是合法 tone", () => {
    for (const s of SCENARIOS) {
      expect(TONES.some((t) => t.id === s.defaultTone)).toBe(true);
    }
  });
  it("scenario / tone id 唯一", () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    expect(new Set(TONES.map((t) => t.id)).size).toBe(TONES.length);
  });
  it("getter", () => {
    expect(getScenario("raise")?.label).toContain("加薪");
    expect(getScenario("nope")).toBeUndefined();
    expect(getTone("firm")?.label).toBe("堅定");
  });
});

describe("parseCoachVersions", () => {
  it("解析乾淨 JSON 陣列", () => {
    const v = parseCoachVersions('[{"style":"簡短版","message":"你好，方便嗎？"},{"style":"完整版","message":"您好，想跟您談件事。"}]');
    expect(v).toHaveLength(2);
    expect(v[0].style).toBe("簡短版");
    expect(v[1].message).toContain("談件事");
  });

  it("容忍 markdown 圍欄與前後雜訊", () => {
    const v = parseCoachVersions('好的，這是三版：\n```json\n[{"message":"版一"},{"message":"版二"}]\n```');
    expect(v).toHaveLength(2);
    expect(v[0].style).toBe("版本 1"); // 缺 style → 補
  });

  it("純字串陣列也接受", () => {
    const v = parseCoachVersions('["直接一句話","另一句"]');
    expect(v).toHaveLength(2);
    expect(v[0].message).toBe("直接一句話");
  });

  it("最多 3 版", () => {
    const v = parseCoachVersions('[{"message":"1"},{"message":"2"},{"message":"3"},{"message":"4"}]');
    expect(v).toHaveLength(3);
  });

  it("空訊息略過、壞輸入回 []", () => {
    expect(parseCoachVersions('[{"message":""},{"message":"  "}]')).toHaveLength(0);
    expect(parseCoachVersions("不是 JSON")).toHaveLength(0);
    expect(parseCoachVersions("")).toHaveLength(0);
  });
});
