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

// ============ 採集系統 ============
export type ResourceKind = "wood" | "crystal" | "shell";

export const RESOURCE_META: Record<ResourceKind, { emoji: string; label: string; respawnSec: number; rewardCoin: number }> = {
  wood:    { emoji: "🪵", label: "木材", respawnSec: 60, rewardCoin: 1 },
  crystal: { emoji: "💎", label: "水晶", respawnSec: 180, rewardCoin: 5 },
  shell:   { emoji: "🐚", label: "貝殼", respawnSec: 30, rewardCoin: 1 },
};

// 採集事件：HUD bag 監聽、更新數量 + 浮 toast
type CollectEvent = { kind: ResourceKind; count: number };
const collectSubs = new Set<(e: CollectEvent) => void>();
export function subscribeCollect(fn: (e: CollectEvent) => void) {
  collectSubs.add(fn);
  return () => { collectSubs.delete(fn); };
}
export function emitCollect(e: CollectEvent) {
  for (const f of collectSubs) f(e);
}

// 純客戶端 inventory（localStorage）
const INV_KEY = "ai_island_inventory_v1";
export function readInventory(): Record<ResourceKind, number> {
  if (typeof window === "undefined") return { wood: 0, crystal: 0, shell: 0 };
  try {
    const raw = localStorage.getItem(INV_KEY);
    if (raw) return { wood: 0, crystal: 0, shell: 0, ...JSON.parse(raw) };
  } catch {}
  return { wood: 0, crystal: 0, shell: 0 };
}
export function addToInventory(kind: ResourceKind, n: number) {
  const inv = readInventory();
  inv[kind] = (inv[kind] ?? 0) + n;
  try { localStorage.setItem(INV_KEY, JSON.stringify(inv)); } catch {}
  return inv;
}
export function resetInventory(): Record<ResourceKind, number> {
  const empty: Record<ResourceKind, number> = { wood: 0, crystal: 0, shell: 0 };
  try { localStorage.setItem(INV_KEY, JSON.stringify(empty)); } catch {}
  return empty;
}
