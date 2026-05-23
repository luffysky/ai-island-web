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

// ============ 我的家系統 ============
export type FurnitureKind = "bed" | "rug" | "lamp" | "shelf" | "plant" | "table";

export const FURNITURE_META: Record<FurnitureKind, { label: string; emoji: string; cost: Partial<Record<ResourceKind, number>>; effect?: string }> = {
  bed:    { label: "床",   emoji: "🛏️", cost: { wood: 8 },               effect: "睡覺補 +1 ❤️（每日一次）" },
  rug:    { label: "地毯", emoji: "🟫", cost: { wood: 3, shell: 2 } },
  lamp:   { label: "燈",   emoji: "💡", cost: { crystal: 1 } },
  shelf:  { label: "書架", emoji: "📚", cost: { wood: 5 } },
  plant:  { label: "盆栽", emoji: "🪴", cost: { wood: 2, shell: 3 } },
  table:  { label: "桌子", emoji: "🪑", cost: { wood: 4 } },
};

type HouseState = {
  builtAt: string | null; // 蓋好時間 ISO（null = 還沒蓋）
  furniture: FurnitureKind[];
  lastSleepDate: string | null; // YYYY-MM-DD
};

const HOUSE_KEY = "ai_island_house_v1";
const HOUSE_BUILD_COST: Partial<Record<ResourceKind, number>> = { wood: 20, crystal: 1 };
export function getHouseBuildCost() { return { ...HOUSE_BUILD_COST }; }

export function readHouseState(): HouseState {
  if (typeof window === "undefined") return { builtAt: null, furniture: [], lastSleepDate: null };
  try {
    const raw = localStorage.getItem(HOUSE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { builtAt: s.builtAt ?? null, furniture: s.furniture ?? [], lastSleepDate: s.lastSleepDate ?? null };
    }
  } catch {}
  return { builtAt: null, furniture: [], lastSleepDate: null };
}

function writeHouseState(s: HouseState) {
  try { localStorage.setItem(HOUSE_KEY, JSON.stringify(s)); } catch {}
  for (const f of houseSubs) f(s);
}

const houseSubs = new Set<(s: HouseState) => void>();
export function subscribeHouse(fn: (s: HouseState) => void) {
  houseSubs.add(fn);
  return () => { houseSubs.delete(fn); };
}

export function buildHouse(): HouseState {
  const s = readHouseState();
  if (s.builtAt) return s;
  s.builtAt = new Date().toISOString();
  writeHouseState(s);
  return s;
}

export function addFurniture(kind: FurnitureKind): HouseState {
  const s = readHouseState();
  s.furniture = [...(s.furniture ?? []), kind];
  writeHouseState(s);
  return s;
}

export function markSlept(date: string): HouseState {
  const s = readHouseState();
  s.lastSleepDate = date;
  writeHouseState(s);
  return s;
}

// 開家門板事件
const houseOpenSubs = new Set<() => void>();
export function emitHouseOpen() { for (const f of houseOpenSubs) f(); }
export function subscribeHouseOpen(fn: () => void) {
  houseOpenSubs.add(fn);
  return () => { houseOpenSubs.delete(fn); };
}

// ============ 釣魚系統 ============
export type FishKind = "minnow" | "carp" | "tuna" | "golden" | "dragon";

export const FISH_META: Record<FishKind, { label: string; emoji: string; rarity: number; coinReward: number; minSeconds: number; maxSeconds: number }> = {
  minnow:  { label: "鯽魚",   emoji: "🐟", rarity: 0.45, coinReward: 3,  minSeconds: 2, maxSeconds: 4 },
  carp:    { label: "鯉魚",   emoji: "🐠", rarity: 0.30, coinReward: 8,  minSeconds: 3, maxSeconds: 6 },
  tuna:    { label: "鮪魚",   emoji: "🐡", rarity: 0.15, coinReward: 15, minSeconds: 4, maxSeconds: 7 },
  golden:  { label: "金魚",   emoji: "🥇", rarity: 0.08, coinReward: 30, minSeconds: 5, maxSeconds: 9 },
  dragon:  { label: "龍魚",   emoji: "🐲", rarity: 0.02, coinReward: 100, minSeconds: 6, maxSeconds: 10 },
};

const FISH_KEY = "ai_island_fish_v1";
export function readFishCounts(): Record<FishKind, number> {
  if (typeof window === "undefined") return { minnow: 0, carp: 0, tuna: 0, golden: 0, dragon: 0 };
  try {
    const raw = localStorage.getItem(FISH_KEY);
    return { minnow: 0, carp: 0, tuna: 0, golden: 0, dragon: 0, ...JSON.parse(raw ?? "{}") };
  } catch { return { minnow: 0, carp: 0, tuna: 0, golden: 0, dragon: 0 }; }
}
export function addFish(kind: FishKind, n = 1): Record<FishKind, number> {
  const c = readFishCounts();
  c[kind] = (c[kind] ?? 0) + n;
  try { localStorage.setItem(FISH_KEY, JSON.stringify(c)); } catch {}
  for (const f of fishSubs) f(c);
  return c;
}
const fishSubs = new Set<(c: Record<FishKind, number>) => void>();
export function subscribeFish(fn: (c: Record<FishKind, number>) => void) {
  fishSubs.add(fn);
  return () => { fishSubs.delete(fn); };
}

export function rollFish(): FishKind {
  const r = Math.random();
  let acc = 0;
  for (const k of Object.keys(FISH_META) as FishKind[]) {
    acc += FISH_META[k].rarity;
    if (r < acc) return k;
  }
  return "minnow";
}

// 釣魚 trigger（F 鍵、走到沙岸）
const fishingSubs = new Set<() => void>();
export function emitFishing() { for (const f of fishingSubs) f(); }
export function subscribeFishing(fn: () => void) {
  fishingSubs.add(fn);
  return () => { fishingSubs.delete(fn); };
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

// tier 由 server 決定（避免 client 偽造大吉領 50 z）
// client 只負責存結果到 localStorage 防重抽
export function saveFortuneResult(f: Fortune) {
  const today = todayKey();
  try { localStorage.setItem(FORTUNE_KEY, JSON.stringify({ date: today, result: f })); } catch {}
  if (f.rewardKind === "bond") bumpBond(f.reward);
  if (f.rewardKind === "crystal") addToInventory("crystal", f.reward);
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

// ============ 玩家位置共享（給 Minimap / 寶箱用） ============
export const playerWorldPos = { x: 0, z: 6, rot: 0 };

// ============ 寶箱 ============
export type ChestSpawn = { id: number; pos: [number, number]; rewardCoin: number };
export const CHESTS: ChestSpawn[] = [
  { id: 901, pos: [27, 16], rewardCoin: 30 },
  { id: 902, pos: [-26, 18], rewardCoin: 30 },
  { id: 903, pos: [22, -22], rewardCoin: 50 },
  { id: 904, pos: [-22, -22], rewardCoin: 50 },
  { id: 905, pos: [0, 27], rewardCoin: 100 },
];

const CHEST_OPEN_KEY = "ai_island_chests_v1";
export function readOpenedChests(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(CHEST_OPEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
export function markChestOpen(id: number): Set<number> {
  const s = readOpenedChests();
  s.add(id);
  try { localStorage.setItem(CHEST_OPEN_KEY, JSON.stringify(Array.from(s))); } catch {}
  for (const f of chestSubs) f(s);
  return s;
}
export function unmarkChestOpen(id: number): Set<number> {
  const s = readOpenedChests();
  s.delete(id);
  try { localStorage.setItem(CHEST_OPEN_KEY, JSON.stringify(Array.from(s))); } catch {}
  for (const f of chestSubs) f(s);
  return s;
}
const chestSubs = new Set<(s: Set<number>) => void>();
export function subscribeChests(fn: (s: Set<number>) => void) {
  chestSubs.add(fn);
  return () => { chestSubs.delete(fn); };
}

// ============ 島嶼成就 ============
export type AchievementId =
  | "first_step" | "tree_lover" | "crystal_hunter" | "shell_collector"
  | "marathon" | "talker" | "rich" | "treasure_hunter"
  | "night_owl" | "storm_walker";

export const ACHIEVEMENTS: Record<AchievementId, { label: string; desc: string; emoji: string; reward: number; target: number }> = {
  first_step:      { label: "踏出第一步", desc: "在島上走 10 公尺", emoji: "👣", reward: 10, target: 10 },
  tree_lover:      { label: "樹之友",     desc: "累計砍 10 棵樹", emoji: "🌳", reward: 50, target: 10 },
  crystal_hunter:  { label: "尋晶人",     desc: "累計採 5 顆水晶", emoji: "💎", reward: 80, target: 5 },
  shell_collector: { label: "拾貝者",     desc: "累計撿 10 個貝殼", emoji: "🐚", reward: 50, target: 10 },
  marathon:        { label: "島嶼馬拉松", desc: "累計走 1000 公尺", emoji: "🏃", reward: 100, target: 1000 },
  talker:          { label: "島民之友",   desc: "跟 3 個 NPC 都說過話", emoji: "🗣️", reward: 60, target: 3 },
  rich:            { label: "小富翁",     desc: "從島嶼累計賺 200 z 幣", emoji: "🪙", reward: 80, target: 200 },
  treasure_hunter: { label: "尋寶高手",   desc: "打開全部 5 個寶箱", emoji: "🪅", reward: 200, target: 5 },
  night_owl:       { label: "夜行者",     desc: "在夜晚採集 5 次", emoji: "🌙", reward: 50, target: 5 },
  storm_walker:    { label: "雨中漫步",   desc: "在雨天走 100 公尺", emoji: "🌧️", reward: 50, target: 100 },
};

type AchState = { progress: Record<string, number>; unlocked: Record<string, boolean>; claimed: Record<string, boolean>; talkedNpcs: string[] };
const ACH_KEY = "ai_island_ach_v1";

export function readAchState(): AchState {
  if (typeof window === "undefined") return { progress: {}, unlocked: {}, claimed: {}, talkedNpcs: [] };
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { progress: s.progress ?? {}, unlocked: s.unlocked ?? {}, claimed: s.claimed ?? {}, talkedNpcs: s.talkedNpcs ?? [] };
    }
  } catch {}
  return { progress: {}, unlocked: {}, claimed: {}, talkedNpcs: [] };
}

function writeAchState(s: AchState) {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(s)); } catch {}
  for (const f of achSubs) f(s);
}

const achSubs = new Set<(s: AchState) => void>();
export function subscribeAch(fn: (s: AchState) => void) {
  achSubs.add(fn);
  return () => { achSubs.delete(fn); };
}

export function bumpAch(id: AchievementId, n = 1): AchState {
  const s = readAchState();
  const meta = ACHIEVEMENTS[id];
  if (!meta) return s;
  s.progress[id] = Math.min(meta.target, (s.progress[id] ?? 0) + n);
  if (s.progress[id] >= meta.target && !s.unlocked[id]) {
    s.unlocked[id] = true;
    // 派發解鎖事件給 toast
    for (const f of achUnlockSubs) f(id);
  }
  writeAchState(s);
  return s;
}

export function noteNpcTalked(id: NpcId): AchState {
  const s = readAchState();
  if (!s.talkedNpcs.includes(id)) {
    s.talkedNpcs.push(id);
    s.progress["talker"] = s.talkedNpcs.length;
    if (s.talkedNpcs.length >= ACHIEVEMENTS.talker.target && !s.unlocked.talker) {
      s.unlocked.talker = true;
      for (const f of achUnlockSubs) f("talker");
    }
  }
  writeAchState(s);
  return s;
}

export function markAchClaimed(id: AchievementId): AchState {
  const s = readAchState();
  s.claimed[id] = true;
  writeAchState(s);
  return s;
}

const achUnlockSubs = new Set<(id: AchievementId) => void>();
export function subscribeAchUnlock(fn: (id: AchievementId) => void) {
  achUnlockSubs.add(fn);
  return () => { achUnlockSubs.delete(fn); };
}

// ============ 背包打開事件（B 鍵） ============
const bagSubs = new Set<() => void>();
export function emitBagToggle() { for (const f of bagSubs) f(); }
export function subscribeBagToggle(fn: () => void) {
  bagSubs.add(fn);
  return () => { bagSubs.delete(fn); };
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
