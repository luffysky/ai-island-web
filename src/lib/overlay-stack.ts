/**
 * 全域 overlay 堆疊：modal 開時 push、關時 pop。
 * floating 元件（Pet / TutorBall / AdminPill / TodoDropdown）監聽、>0 時隱藏。
 * 解決手機 TODO / dropdown 開啟被浮層擋的問題。
 */
let count = 0;
const subs = new Set<(n: number) => void>();

export function pushOverlay() {
  count++;
  for (const f of subs) f(count);
}
export function popOverlay() {
  count = Math.max(0, count - 1);
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
 */
import { useEffect } from "react";
export function useOverlayRegister(open: boolean) {
  useEffect(() => {
    if (!open) return;
    pushOverlay();
    return () => popOverlay();
  }, [open]);
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
