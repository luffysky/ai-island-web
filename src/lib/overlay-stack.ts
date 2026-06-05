/**
 * 全域 overlay 堆疊：modal 開時 push、關時 pop。
 * floating 元件（Pet / TutorBall / AdminPill / TodoDropdown）監聽、>0 時隱藏。
 * 解決手機 TODO / dropdown 開啟被浮層擋的問題。
 *
 * 副作用：count 從 0→1 時鎖 body scroll、1→0 時釋放。
 * 避免 AI 導師 / dropdown 開啟時下面主內容跟著滑（林董抱怨：很怪）。
 */
let count = 0;        // 總 overlay 數（floating 元件據此隱藏）
let lockCount = 0;    // 需要鎖 body scroll 的 overlay 數（非 modal 的浮動面板不鎖）
const subs = new Set<(n: number) => void>();
let savedScrollY = 0;
let savedBodyStyle: { overflow: string; position: string; top: string; width: string; paddingRight: string } | null = null;

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (savedBodyStyle) return;  // 已經 lock 過了、不重複
  const body = document.body;
  savedScrollY = window.scrollY || window.pageYOffset || 0;
  // 算 scrollbar 寬（避免 lock 時版面跳一下）
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  savedBodyStyle = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  };
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.width = "100%";
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  if (!savedBodyStyle) return;
  const body = document.body;
  body.style.overflow = savedBodyStyle.overflow;
  body.style.position = savedBodyStyle.position;
  body.style.top = savedBodyStyle.top;
  body.style.width = savedBodyStyle.width;
  body.style.paddingRight = savedBodyStyle.paddingRight;
  savedBodyStyle = null;
  // 還原 scroll 位置
  window.scrollTo(0, savedScrollY);
}

export function pushOverlay(lockScroll = true) {
  count++;
  if (lockScroll) {
    lockCount++;
    if (lockCount === 1) lockBodyScroll();
  }
  for (const f of subs) f(count);
}
export function popOverlay(lockScroll = true) {
  count = Math.max(0, count - 1);
  if (lockScroll) {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) unlockBodyScroll();
  }
  for (const f of subs) f(count);
}
export function getOverlayCount() { return count; }
export function subscribeOverlay(fn: (n: number) => void) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

/**
 * React hook 給 modal 用：open=true 時自動 push、unmount/false 時 pop
 *   useOverlayRegister(open);
 *
 * lockScroll=false：只標記「有浮層開著」（讓 Pet / TutorBall 等讓位），但不鎖 body scroll。
 * 用在「非 modal 的浮動面板」（如 AI 導師聊天視窗）：游標在頁面要能滾頁面、在面板才滾面板。
 */
import { useEffect } from "react";
export function useOverlayRegister(open: boolean, lockScroll = true) {
  useEffect(() => {
    if (!open) return;
    pushOverlay(lockScroll);
    return () => popOverlay(lockScroll);
  }, [open, lockScroll]);
}

/**
 * React hook 給 floating 用：return 當前 overlay 數、>0 就該隱藏
 *   const overlayCount = useOverlayCount();
 *   if (overlayCount > 0) return null;
 */
import { useState } from "react";
export function useOverlayCount() {
  const [n, setN] = useState(0);
  useEffect(() => subscribeOverlay(setN), []);
  return n;
}
