// 純資料 / 訊息匯流排、不依賴 three.js — 給 IslandClient、TouchControls 用。
// 把這層獨立出來、避免靜態 import IslandV0 把整個 3D bundle 拖進 server SSR。

export type IslandNodeId = "chapters" | "courses" | "leaderboard" | "forum" | "blogs";

const openSubs = new Set<(id: IslandNodeId) => void>();

export function subscribeOpen(fn: (id: IslandNodeId) => void) {
  openSubs.add(fn);
  return () => { openSubs.delete(fn); };
}

export function emitOpen(id: IslandNodeId) {
  for (const f of openSubs) f(id);
}

// 手機虛擬搖桿輸入（TouchControls 寫進、Player useFrame 讀）
export const touchInput = { x: 0, y: 0, interact: false, run: false };

let interactPulse = false;
export function touchInteract() { interactPulse = true; }
export function consumeInteractPulse() {
  const v = interactPulse;
  interactPulse = false;
  return v;
}
