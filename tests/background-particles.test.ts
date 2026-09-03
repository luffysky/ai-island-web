import { describe, it, expect } from "vitest";
import { particleInk, luminanceOf } from "@/lib/background/particle-color";
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

describe("particleInk — 粒子原色不動，看不清楚才加暈", () => {
  it("底色亮度不明（null）→ 原色、不加暈", () => {
    expect(particleInk("255,255,255", null)).toEqual({ fill: "255,255,255", halo: null });
  });

  it("深色主題 + 白雪 → 原色、不用加暈（本來就看得見）", () => {
    expect(particleInk("255,255,255", 0.08)).toEqual({ fill: "255,255,255", halo: null });
  });

  it("淺色主題 + 白雪 → 雪還是白的（不再被壓成灰點），改用深色暈托出來", () => {
    const ink = particleInk("255,255,255", 0.92);
    expect(ink.fill).toBe("255,255,255");
    expect(ink.halo).not.toBeNull();
    expect(lum(ink.halo!)).toBeLessThan(0.2);
  });

  it("淺色主題 + 櫻花粉 → 粉色不動，暈保留色相（不會變灰）", () => {
    const ink = particleInk("255,183,197", 0.92);
    expect(ink.fill).toBe("255,183,197");
    const [r, g, b] = ink.halo!.split(",").map(Number);
    expect(r).toBeGreaterThan(g!);
    expect(b!).toBeGreaterThan(g!);
  });

  it("深色主題 + 幾乎全黑的粒子 → 加亮色暈", () => {
    const ink = particleInk("10,10,12", 0.05);
    expect(ink.fill).toBe("10,10,12");
    expect(lum(ink.halo!)).toBeGreaterThan(0.8);
  });

  it("已經有對比的組合不加暈（淺底 + 深粒子）", () => {
    expect(particleInk("30,30,30", 0.9).halo).toBeNull();
  });

  it("壞掉的顏色字串原樣回傳、不會炸", () => {
    expect(particleInk("nope", 0.9)).toEqual({ fill: "nope", halo: null });
    expect(particleInk("1,2", 0.9)).toEqual({ fill: "1,2", halo: null });
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
