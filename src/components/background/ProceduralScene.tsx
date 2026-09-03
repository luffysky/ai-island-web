"use client";

import { useEffect, useRef } from "react";
import type { SceneDef, SceneShape } from "@/lib/background/scenes";
import { luminanceOf, particleInk, type ParticleInk } from "@/lib/background/particle-color";

/**
 * 內建動態場景（雪/雨/櫻花…）。canvas 粒子系統，資料驅動（見 lib/background/scenes）。
 * 從 SnowRealmSpace 的 ProceduralScene 逐字移植，改為接 `scene` 物件（而非 sceneId）。
 *
 * base 漸層當底色，粒子疊在上面；`showBase=false`（「只要粒子」模式）則不畫底色，
 * 讓粒子直接疊在頁面既有的不透明底色上（粒子原色不變，跟底色太接近時自動加一層暈）。
 * 無障礙/效能：reduced-motion 或省流量 → 只顯示靜態底、不跑動畫；
 * 分頁不可見 → 暫停 rAF 內的繪製。
 */
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  phase: number;
  vphase: number;
  rot: number;
  vr: number;
  color: string;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * 畫一顆粒子。`r`/`lw` 分開帶進來是為了「暈」——同一個形狀先用放大/加粗的低透明度
 * 對比色畫一次墊底，再用原色畫本體（見 inkOf）。粒子原色永遠不改。
 */
function drawShape(
  c: CanvasRenderingContext2D,
  shape: SceneShape,
  p: Particle,
  col: string,
  r: number,
  lw: number,
) {
  if (shape === "streak") {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(p.x - 1.5, p.y + r);
    c.stroke();
    return;
  }
  if (shape === "ring") {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    c.arc(p.x, p.y, r, 0, Math.PI * 2);
    c.stroke();
    return;
  }
  if (shape === "petal") {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(0, 0, r, r * 0.52, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    return;
  }
  if (shape === "square") {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.fillStyle = col;
    c.fillRect(-r / 2, -r / 2, r, r * 1.4);
    c.restore();
    return;
  }
  if (shape === "heart") {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot * 0.3);
    c.scale(r / 10, r / 10);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, 3);
    c.bezierCurveTo(0, 0, -5, -2, -5, 2);
    c.bezierCurveTo(-5, 6, 0, 8, 0, 11);
    c.bezierCurveTo(0, 8, 5, 6, 5, 2);
    c.bezierCurveTo(5, -2, 0, 0, 0, 3);
    c.fill();
    c.restore();
    return;
  }
  if (shape === "star") {
    c.save();
    c.translate(p.x, p.y);
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / 5;
      const ox = Math.cos(ang) * r;
      const oy = Math.sin(ang) * r;
      i === 0 ? c.moveTo(ox, oy) : c.lineTo(ox, oy);
      const ia = ang + Math.PI / 5;
      c.lineTo(Math.cos(ia) * r * 0.45, Math.sin(ia) * r * 0.45);
    }
    c.closePath();
    c.fill();
    c.restore();
    return;
  }
  // circle
  c.fillStyle = col;
  c.beginPath();
  c.arc(p.x, p.y, r, 0, Math.PI * 2);
  c.fill();
}

/** 描邊型的形狀（雨絲/氣泡）：暈是「加粗」、不是「放大」。 */
const STROKED: ReadonlySet<SceneShape> = new Set<SceneShape>(["streak", "ring"]);

/**
 * 暈＝三層由外而內、越來越濃的同形狀描摹 [額外半徑倍率, alpha 倍率]。
 * 用三層淡的疊出柔邊（單層濃的會變成一圈難看的「甜甜圈」），
 * 而且比 canvas shadowBlur 便宜很多、也不會把冰晶/花瓣糊成一團。
 */
const HALO_RINGS: readonly (readonly [number, number])[] = [
  [1, 0.1],
  [0.62, 0.13],
  [0.3, 0.17],
];

/**
 * 往上找第一個「真的有畫底色」的祖先，回傳它的亮度。
 * 全站背景層：層本身/body 都是透明 → 一路找到 <html>（＝主題的 --color-bg）。
 * Theme Studio 預覽框：框自己有 background → 拿到的是「預覽中的那個主題」的底色。
 */
function ancestorBgLuminance(el: Element | null): number | null {
  let node: Element | null = el;
  while (node) {
    const c = getComputedStyle(node).backgroundColor;
    const alpha = c.startsWith("rgba(") ? Number(c.match(/-?[\d.]+/g)?.[3] ?? 1) : 1;
    if (c && c !== "transparent" && alpha > 0.5) {
      const lum = luminanceOf(c);
      if (lum !== null) return lum;
    }
    node = node.parentElement;
  }
  return null;
}

export function ProceduralScene({
  scene,
  density = 1,
  className,
  showBase = true,
}: {
  scene: SceneDef | null;
  density?: number;
  className?: string;
  /** false = 只要粒子（不畫 scene.base 底色）。靜態場景請維持 true。 */
  showBase?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const densityRef = useRef(density);
  densityRef.current = density;
  const showBaseRef = useRef(showBase);
  showBaseRef.current = showBase;

  useEffect(() => {
    if (!scene || scene.kind !== "dynamic") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const saveData =
      (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduce || saveData) return;

    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const def: SceneDef = scene;
    const behavior = def.behavior ?? "fall";
    const shape: SceneShape = def.shape ?? "circle";
    const colors = def.colors ?? ["255,255,255"];
    const speed = def.speed ?? 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];

    function make(initial: boolean): Particle {
      const r = rand(def.sizeMin ?? 1, def.sizeMax ?? 3);
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const base: Particle = {
        x: rand(0, w),
        y: rand(0, h),
        vx: 0,
        vy: 0,
        r,
        a: rand(0.5, 0.95),
        phase: rand(0, Math.PI * 2),
        vphase: rand(0.01, 0.05),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.04, 0.04),
        color,
      };
      if (behavior === "rain") {
        base.vy = rand(9, 16) * speed;
        base.a = rand(0.15, 0.4);
        base.y = initial ? rand(-h, h) : rand(-h, -10);
      } else if (behavior === "twinkle") {
        base.vphase = rand(0.02, 0.06);
      } else if (behavior === "wander") {
        base.vx = rand(-0.4, 0.4) * speed;
        base.vy = rand(-0.4, 0.4) * speed;
        base.a = rand(0.3, 1);
      } else if (behavior === "rise") {
        base.vy = -rand(0.4, 1.2) * speed;
        base.a = rand(0.2, 0.6);
        base.y = initial ? rand(0, h) : h + rand(6, 40);
      } else {
        // fall / petal
        base.vx = rand(-0.4, 0.6) * speed;
        base.vy = rand(0.4, 1.4) * speed;
        base.y = initial ? rand(0, h) : rand(-40, -6);
      }
      return base;
    }

    function init() {
      const area = w * h;
      const divisor = 8000 / Math.max(0.15, Math.min(3, (def.density ?? 1) * densityRef.current));
      const count = Math.min(600, Math.max(10, Math.round(area / divisor)));
      particles = Array.from({ length: count }, () => make(true));
    }

    function resize() {
      const rect = parent!.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    }

    function step(p: Particle, k: number) {
      p.phase += p.vphase * k;
      if (behavior === "twinkle") {
        p.a = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(p.phase));
        return;
      }
      if (behavior === "wander") {
        p.vx = Math.max(-0.7, Math.min(0.7, p.vx + rand(-0.03, 0.03) * k));
        p.vy = Math.max(-0.7, Math.min(0.7, p.vy + rand(-0.03, 0.03) * k));
        p.x += p.vx * k;
        p.y += p.vy * k;
        p.a = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(p.phase));
        if (p.x < -12) p.x = w + 10;
        if (p.x > w + 12) p.x = -10;
        if (p.y < -12) p.y = h + 10;
        if (p.y > h + 12) p.y = -10;
        return;
      }
      if (behavior === "rise") {
        p.x += Math.sin(p.phase) * 0.4 * k;
        p.y += p.vy * k;
        if (p.y < -p.r - 6) Object.assign(p, make(false));
        return;
      }
      // fall / petal / rain
      const sway =
        behavior === "petal"
          ? Math.sin(p.phase) * 0.7
          : behavior === "fall"
            ? Math.sin(p.phase) * 0.3
            : 0;
      p.x += (p.vx + sway) * k;
      p.y += p.vy * k;
      p.rot += p.vr * k;
      if (p.y > h + 16) Object.assign(p, make(false));
      if (p.x < -14) p.x = w + 10;
      if (p.x > w + 14) p.x = -10;
    }

    // 沒有底色時，粒子要跟「實際底色」有對比 —— 但**不改粒子本身的顏色**（雪還是白的），
    // 對比不夠就在後面墊一層暈。底色會被主題（/theme-studio）換掉 → 監聽 <html> 與父層重算。
    let inkCache = new Map<string, ParticleInk>();
    let bgLum: number | null = null;
    function syncBgLum() {
      const next = showBaseRef.current ? null : ancestorBgLuminance(parent ?? null);
      if (next !== bgLum) {
        bgLum = next;
        inkCache = new Map();
      }
    }
    function inkOf(p: Particle) {
      let ink = inkCache.get(p.color);
      if (ink === undefined) {
        ink = particleInk(p.color, bgLum);
        inkCache.set(p.color, ink);
      }
      return ink;
    }
    syncBgLum();
    const themeAttrs = ["style", "class", "data-mode", "data-palette", "data-theme"];
    const themeObserver = new MutationObserver(syncBgLum);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: themeAttrs,
    });
    // 預覽框（Theme Studio）是把主題變數寫在自己的 style 上、不是 <html> → 也要盯著。
    if (parent !== document.documentElement) {
      themeObserver.observe(parent!, { attributes: true, attributeFilter: themeAttrs });
    }

    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const k = Math.min(3, (now - last) / 16);
      last = now;
      if (document.visibilityState === "visible") {
        ctx!.clearRect(0, 0, w, h);
        const stroked = STROKED.has(shape);
        // 粒子多的時候少畫一層暈（省 canvas 呼叫，外圈本來就最淡、拿掉幾乎看不出來）。
        const rings = particles.length > 350 ? HALO_RINGS.slice(1) : HALO_RINGS;
        for (const p of particles) {
          step(p, k);
          const ink = inkOf(p);
          if (ink.halo) {
            for (const [grow, ha] of rings) {
              const col = `rgba(${ink.halo},${p.a * ha})`;
              if (stroked) drawShape(ctx!, shape, p, col, p.r, 1 + grow * 2.4);
              else drawShape(ctx!, shape, p, col, p.r + Math.max(0.8, p.r * grow), 1);
            }
          }
          drawShape(ctx!, shape, p, `rgba(${ink.fill},${p.a})`, p.r, 1);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [scene, showBase]);

  if (!scene) return null;
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        background: showBase ? scene.base : "transparent",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      {scene.kind === "dynamic" && (
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
