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
export type NpcId = "elder" | "merchant" | "seer";

const npcSubs = new Set<(id: NpcId) => void>();
export function subscribeNpc(fn: (id: NpcId) => void) {
  npcSubs.add(fn);
  return () => { npcSubs.delete(fn); };
}
export function emitNpc(id: NpcId) {
  for (const f of npcSubs) f(id);
}

// ============ Buff 系統 ============
export type BuffKind = "speed" | "double_coin" | "fast_respawn";

type Buff = { kind: BuffKind; until: number };
let activeBuffs: Buff[] = [];
const buffSubs = new Set<(b: Buff[]) => void>();

export function applyBuff(kind: BuffKind, durationSec: number) {
  const until = performance.now() + durationSec * 1000;
  activeBuffs = activeBuffs.filter((b) => b.kind !== kind || b.until > until);
  activeBuffs.push({ kind, until });
  for (const f of buffSubs) f([...activeBuffs]);
}

export function getActiveBuffs(): Buff[] {
  const now = performance.now();
  const pruned = activeBuffs.filter((b) => b.until > now);
  if (pruned.length !== activeBuffs.length) {
    activeBuffs = pruned;
    for (const f of buffSubs) f([...activeBuffs]);
  }
  return [...activeBuffs];
}

export function hasBuff(kind: BuffKind): boolean {
  return getActiveBuffs().some((b) => b.kind === kind);
}

export function subscribeBuffs(fn: (b: Buff[]) => void) {
  buffSubs.add(fn);
  return () => { buffSubs.delete(fn); };
}

// ============ 商人物品 ============
export type ShopItem = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  cost: Partial<Record<ResourceKind, number>>;
  apply: () => void;
};

// 在 island-bus 內無法 import 寵物 / quest helpers? 已經都在這個檔，直接用。
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "speed_potion",
    emoji: "⚡",
    label: "加速藥水",
    desc: "30 秒內跑速 ×1.5",
    cost: { wood: 5 },
    apply: () => applyBuff("speed", 30),
  },
  {
    id: "pet_treat",
    emoji: "🍖",
    label: "寵物零食",
    desc: "親密度 +5",
    cost: { shell: 3 },
    apply: () => bumpBond(5),
  },
  {
    id: "respawn_rush",
    emoji: "🌱",
    label: "豐收符咒",
    desc: "60 秒內採集冷卻 ×0.3",
    cost: { crystal: 1 },
    apply: () => applyBuff("fast_respawn", 60),
  },
  {
    id: "double_coin",
    emoji: "💰",
    label: "雙倍幸運",
    desc: "下次兌換 z 幣 ×2",
    cost: { wood: 3, crystal: 1 },
    apply: () => applyBuff("double_coin", 600),
  },
];

// ============ 占卜（每日一次） ============
export type Fortune = { tier: "大吉" | "吉" | "平" | "凶" | "大凶"; reward: number; rewardKind: "coin" | "bond" | "crystal"; emoji: string; message: string };
const FORTUNE_KEY = "ai_island_fortune_v1";

export function readFortuneToday(): { date: string; result: Fortune | null } {
  const today = todayKey();
  if (typeof window === "undefined") return { date: today, result: null };
  try {
    const raw = localStorage.getItem(FORTUNE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.date === today) return s;
    }
  } catch {}
  return { date: today, result: null };
}

export function rollFortune(): Fortune {
  const r = Math.random();
  let f: Fortune;
  if (r < 0.1) f = { tier: "大吉", reward: 50, rewardKind: "coin", emoji: "🎊", message: "今日天運在你、放手去做！" };
  else if (r < 0.4) f = { tier: "吉", reward: 20, rewardKind: "coin", emoji: "🎁", message: "穩穩走、就是穩穩贏" };
  else if (r < 0.7) f = { tier: "平", reward: 5, rewardKind: "coin", emoji: "🍀", message: "平凡的日子也很美" };
  else if (r < 0.9) f = { tier: "凶", reward: 5, rewardKind: "bond", emoji: "🌧️", message: "今天累了、跟寵物說說話吧（+5 親密度安慰）" };
  else f = { tier: "大凶", reward: 1, rewardKind: "crystal", emoji: "🆘", message: "上天給你一顆水晶當補償（+1 水晶）" };

  const today = todayKey();
  try { localStorage.setItem(FORTUNE_KEY, JSON.stringify({ date: today, result: f })); } catch {}

  // 套用獎勵
  if (f.rewardKind === "bond") bumpBond(f.reward);
  if (f.rewardKind === "crystal") addToInventory("crystal", f.reward);
  // coin 留給 server claim（避免被 client 偽造）
  return f;
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
