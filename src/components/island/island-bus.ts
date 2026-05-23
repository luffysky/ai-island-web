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

// ============ NPC 互動 ============
export type NpcId = "elder";

const npcSubs = new Set<(id: NpcId) => void>();
export function subscribeNpc(fn: (id: NpcId) => void) {
  npcSubs.add(fn);
  return () => { npcSubs.delete(fn); };
}
export function emitNpc(id: NpcId) {
  for (const f of npcSubs) f(id);
}

// ============ 每日任務 ============
export type DailyQuest = {
  id: string;
  label: string;
  target: number;
  reward: number; // z 幣
  emoji: string;
};

export const TODAY_QUESTS: DailyQuest[] = [
  { id: "wood",     label: "砍 5 棵樹",     target: 5,    reward: 30,  emoji: "🪵" },
  { id: "crystal",  label: "採 1 顆水晶",   target: 1,    reward: 30,  emoji: "💎" },
  { id: "shell",    label: "撿 3 個貝殼",   target: 3,    reward: 20,  emoji: "🐚" },
  { id: "steps",    label: "走 200 公尺",   target: 200,  reward: 20,  emoji: "👣" },
];

type QuestState = {
  date: string;            // YYYY-MM-DD（台北日）
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
};

const QUEST_KEY = "ai_island_quests_v1";

function todayKey(): string {
  const d = new Date(Date.now() + 8 * 3600_000); // 台北時區
  return d.toISOString().slice(0, 10);
}

export function readQuestState(): QuestState {
  const today = todayKey();
  if (typeof window === "undefined") return { date: today, progress: {}, claimed: {} };
  try {
    const raw = localStorage.getItem(QUEST_KEY);
    if (raw) {
      const s = JSON.parse(raw) as QuestState;
      if (s.date === today) return s;
    }
  } catch {}
  // 新一天或無資料 → 重設
  const fresh: QuestState = { date: today, progress: {}, claimed: {} };
  try { localStorage.setItem(QUEST_KEY, JSON.stringify(fresh)); } catch {}
  return fresh;
}

export function bumpQuest(id: string, n = 1): QuestState {
  const s = readQuestState();
  s.progress[id] = Math.min((s.progress[id] ?? 0) + n, getTarget(id));
  try { localStorage.setItem(QUEST_KEY, JSON.stringify(s)); } catch {}
  questSubs.forEach((f) => f(s));
  return s;
}

export function markClaimed(id: string): QuestState {
  const s = readQuestState();
  s.claimed[id] = true;
  try { localStorage.setItem(QUEST_KEY, JSON.stringify(s)); } catch {}
  questSubs.forEach((f) => f(s));
  return s;
}

function getTarget(id: string): number {
  return TODAY_QUESTS.find((q) => q.id === id)?.target ?? 0;
}

const questSubs = new Set<(s: QuestState) => void>();
export function subscribeQuest(fn: (s: QuestState) => void) {
  questSubs.add(fn);
  return () => { questSubs.delete(fn); };
}

// ============ 動態天氣 ============
export type Weather = "sunny" | "cloudy" | "rainy";

let currentWeather: Weather = "sunny";
const weatherSubs = new Set<(w: Weather) => void>();
export function getWeather(): Weather { return currentWeather; }
export function setWeather(w: Weather) {
  if (currentWeather === w) return;
  currentWeather = w;
  for (const f of weatherSubs) f(w);
}
export function subscribeWeather(fn: (w: Weather) => void) {
  weatherSubs.add(fn);
  return () => { weatherSubs.delete(fn); };
}

// ============ 寵物互動 ============
const petSubs = new Set<() => void>();
export function emitPetTalk() { for (const f of petSubs) f(); }
export function subscribePetTalk(fn: () => void) {
  petSubs.add(fn);
  return () => { petSubs.delete(fn); };
}

const BOND_KEY = "ai_island_pet_bond_v1";
export function readBond(): number {
  if (typeof window === "undefined") return 0;
  try { return Number(localStorage.getItem(BOND_KEY) ?? 0) || 0; } catch { return 0; }
}
export function bumpBond(n = 1): number {
  const next = Math.min(100, readBond() + n);
  try { localStorage.setItem(BOND_KEY, String(next)); } catch {}
  return next;
}

// ============ 音效開關 ============
const SOUND_KEY = "ai_island_sound";
export function isSoundOn(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch { return true; }
}
export function setSoundOn(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? "1" : "0"); } catch {}
}
