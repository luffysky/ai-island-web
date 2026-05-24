"use client";
import { useLayoutEffect } from "react";

/**
 * useEdgeSafe — 元件展開後做碰撞偵測：量自己跟視口邊界、超出就 translate 推回視口。
 *
 * 用法：
 *   const ref = useRef<HTMLDivElement>(null);
 *   useEdgeSafe(ref);
 *   return <div ref={ref} className="fixed bottom-6 right-6 w-96 ..." />;
 *
 * 設計：
 *   - 不用斷點，跟 viewport / 元件實際尺寸動態互動
 *   - 兼容元件本來就有的 transform（例如 -translate-x-1/2 居中）
 *   - mount + ResizeObserver（自身或視口尺寸變化）+ orientationchange 觸發重算
 *   - 用 rAF batch、避免抖動
 */
export function useEdgeSafe(ref: React.RefObject<HTMLElement | null>, padding = 8) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 第一次 mount 把元件原本的 transform 抓下來當 baseline，
    // 之後 clamp 只疊加一段 translate，不破壞原本的居中 transform。
    const baseline =
      el.dataset.edgeSafeBaseline ??
      (() => {
        const inline = el.style.transform || "";
        const computed = inline || getComputedStyle(el).transform;
        const base = !computed || computed === "none" ? "" : computed;
        el.dataset.edgeSafeBaseline = base;
        return base;
      })();

    let raf = 0;
    const apply = (dx: number, dy: number) => {
      const t = dx === 0 && dy === 0 ? baseline : `${baseline} translate(${dx}px, ${dy}px)`.trim();
      if (el.style.transform !== t) el.style.transform = t;
    };
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // 先把 clamp 移除、量原始位置
        apply(0, 0);
        const r = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let dx = 0;
        let dy = 0;
        if (r.left < padding) dx = padding - r.left;
        else if (r.right > vw - padding) dx = vw - padding - r.right;
        if (r.top < padding) dy = padding - r.top;
        else if (r.bottom > vh - padding) dy = vh - padding - r.bottom;
        apply(dx, dy);
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(document.documentElement);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      // 不重設 transform、unmount 後 DOM 也消失了
    };
  }, [ref, padding]);
}
