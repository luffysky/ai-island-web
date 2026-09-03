import { describe, it, expect } from "vitest";
import { adaptColor, luminanceOf } from "@/lib/background/particle-color";
import { isParticlesOnly, sceneById, SCENES } from "@/lib/background/scenes";

const lum = (rgb: string) => luminanceOf(rgb)!;

describe("luminanceOf", () => {
  it("吃得下 'r,g,b' 與 computed 的 rgb()/rgba()", () => {
    expect(lum("255,255,255")).toBeCloseTo(1, 5);
    expect(lum("0,0,0")).toBe(0);
    expect(lum("rgb(255, 255, 255)")).toBeCloseTo(1, 5);
    expect(lum("rgba(0, 0, 0, 0.5)")).toBe(0);
  });

  it("看不懂的字串回 null（呼叫端就當作『不調整』）", () => {
    expect(luminanceOf("")).toBeNull();
    expect(luminanceOf("var(--color-bg)")).toBeNull();
  });
});

describe("adaptColor — 粒子要跟主題底色有對比", () => {
  it("底色亮度不明（null）→ 原樣不動", () => {
    expect(adaptColor("255,255,255", null)).toBe("255,255,255");
  });

  it("深色主題 + 亮粒子 → 原樣（本來就看得見）", () => {
    expect(adaptColor("255,255,255", 0.08)).toBe("255,255,255");
  });

  it("淺色主題 + 白粒子 → 壓暗到看得見", () => {
    const out = adaptColor("255,255,255", 0.92);
    expect(out).not.toBe("255,255,255");
    expect(lum(out)).toBeLessThan(0.45);
  });

  it("壓暗會保留色相（櫻花粉還是粉的，不會變灰）", () => {
    const [r, g, b] = adaptColor("255,183,197", 0.92).split(",").map(Number);
    expect(r).toBeGreaterThan(g!);
    expect(b!).toBeGreaterThan(g!);
  });

  it("深色主題 + 幾乎全黑的粒子 → 提亮", () => {
    const out = adaptColor("10,10,12", 0.05);
    expect(lum(out)).toBeGreaterThan(0.4);
  });

  it("已經有對比的組合不亂動（淺底 + 深粒子）", () => {
    expect(adaptColor("30,30,30", 0.9)).toBe("30,30,30");
  });

  it("壞掉的顏色字串原樣回傳、不會炸", () => {
    expect(adaptColor("nope", 0.9)).toBe("nope");
    expect(adaptColor("1,2", 0.9)).toBe("1,2");
  });
});

describe("isParticlesOnly — 哪些背景會保留主題底色", () => {
  const dynamicId = SCENES.find((s) => s.kind === "dynamic")!.id;
  const staticScene = SCENES.find((s) => s.kind === "static");

  it("沒背景 / 漸層 → false（沒有粒子可留）", () => {
    expect(isParticlesOnly(null)).toBe(false);
    expect(isParticlesOnly({ type: "gradient", gradientCss: "linear-gradient(red,blue)" })).toBe(
      false,
    );
  });

  it("動態場景預設就是只要粒子（省略旗標＝true，舊 cookie 也吃得到）", () => {
    expect(isParticlesOnly({ type: "procedural", proceduralId: dynamicId })).toBe(true);
    expect(
      isParticlesOnly({ type: "procedural", proceduralId: dynamicId, particlesOnly: true }),
    ).toBe(true);
  });

  it("明確關掉 → false（回到舊的場景深色底）", () => {
    expect(
      isParticlesOnly({ type: "procedural", proceduralId: dynamicId, particlesOnly: false }),
    ).toBe(false);
  });

  it("靜態場景本身只有底色 → 旗標無效、一律鋪底", () => {
    if (!staticScene) return;
    expect(isParticlesOnly({ type: "procedural", proceduralId: staticScene.id })).toBe(false);
  });

  it("未知場景 id → false", () => {
    expect(sceneById("nope-not-a-scene")).toBeNull();
    expect(isParticlesOnly({ type: "procedural", proceduralId: "nope-not-a-scene" })).toBe(false);
  });
});
