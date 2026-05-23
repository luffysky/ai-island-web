"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Sky, PointerLockControls, KeyboardControls, useKeyboardControls, Text, Html, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import {
  type IslandNodeId,
  type ResourceKind,
  type Weather,
  type NpcId,
  subscribeOpen as _sub,
  emitOpen,
  touchInput,
  consumeInteractPulse,
  emitCollect,
  RESOURCE_META,
  emitNpc,
  bumpQuest,
  subscribeWeather,
  getWeather,
  setWeather,
  emitPetTalk,
  hasBuff,
  CHESTS,
  readOpenedChests,
  markChestOpen,
  unmarkChestOpen,
  bumpAch,
  noteNpcTalked,
  playerWorldPos,
  emitBagToggle,
  addToInventory,
  subscribeChests,
  emitFishing,
  emitHouseOpen,
  readHouseState,
  subscribeHouse,
  touchLook,
} from "./island-bus";
/**
 * S7-S8 3D 島嶼 v0 — 批 1：能站上去的島
 * - 一座島（圓盤地形 + 海平面）
 * - 第三人稱角色（膠囊體）
 * - WASD / 方向鍵走動、shift 加速、相機跟隨
 * - 移動有重力、不會掉出島外（碰邊緣 clamp）
 *
 * 未來批次：節點互動、進度連動村莊建築、AI NPC + 寵物跟隨。
 */

const ISLAND_RADIUS = 30;
const PLAYER_SPEED = 4;
const RUN_MULT = 2.2;
const INTERACT_RADIUS = 2.6;

// Kenney 模型路徑（cc0、放 public/models/）
const M = {
  treePine:  "/models/platformer/tree-pine.glb",
  treePineSmall: "/models/platformer/tree-pine-small.glb",
  tree:      "/models/platformer/tree.glb",
  chest:     "/models/platformer/chest.glb",
  sign:      "/models/platformer/sign.glb",
  flag:      "/models/platformer/flag.glb",
  coinGold:  "/models/platformer/coin-gold.glb",
  key:       "/models/platformer/key.glb",
  rocks:     "/models/platformer/rocks.glb",
  crate:     "/models/platformer/crate.glb",
  barrel:    "/models/platformer/barrel.glb",
  ladder:    "/models/platformer/ladder.glb",
  charPlayer:    "/models/platformer/character-oobi.glb",
  charMerchant:  "/models/platformer/character-oodi.glb",
  charSeer:      "/models/platformer/character-oopi.glb",
  charElder:     "/models/platformer/character-oozi.glb",
};

// 寵物 name → glb（簡單關鍵字對應、預設 fox）
const PET_GLB: Record<string, string> = {
  dog: "/models/pets/animal-dog.glb",
  cat: "/models/pets/animal-cat.glb",
  fox: "/models/pets/animal-fox.glb",
  bunny: "/models/pets/animal-bunny.glb",
  rabbit: "/models/pets/animal-bunny.glb",
  fish: "/models/pets/animal-fish.glb",
  bee: "/models/pets/animal-bee.glb",
  deer: "/models/pets/animal-deer.glb",
  panda: "/models/pets/animal-panda.glb",
  chick: "/models/pets/animal-chick.glb",
  tiger: "/models/pets/animal-tiger.glb",
  lion: "/models/pets/animal-lion.glb",
  monkey: "/models/pets/animal-monkey.glb",
  pig: "/models/pets/animal-pig.glb",
  cow: "/models/pets/animal-cow.glb",
};
function petGlbFor(name: string | null): string {
  if (!name) return "/models/pets/animal-fox.glb";
  const k = Object.keys(PET_GLB).find((x) => name.toLowerCase().includes(x));
  return k ? PET_GLB[k] : "/models/pets/animal-fox.glb";
}

// preload 所有常用
Object.values(M).forEach((p) => useGLTF.preload(p));
Object.values(PET_GLB).forEach((p) => useGLTF.preload(p));

function Glb({ src, scale = 1, rotY = 0 }: { src: string; scale?: number; rotY?: number }) {
  const { scene } = useGLTF(src);
  const clone = useMemo(() => scene.clone(true), [scene]);
  // 開啟陰影
  useEffect(() => {
    clone.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }, [clone]);
  return <primitive object={clone} scale={scale} rotation={[0, rotY, 0]} />;
}

enum K { forward, back, left, right, run, interact, bag, fish }

type Node = {
  id: IslandNodeId;
  position: [number, number, number];
  label: string;
};

const NODES: Node[] = [
  { id: "chapters", position: [8, 0, -4], label: "📚 章節" },
  { id: "courses", position: [-7, 0, 6], label: "🎮 副本" },
  { id: "leaderboard", position: [0, 0, -12], label: "🏆 排行榜" },
  { id: "forum", position: [14, 0, 12], label: "🗣️ 討論區" },
  { id: "blogs", position: [-15, 0, -10], label: "✍️ 部落格" },
];

// 採集物（位置 + 種類）
type ResourceSpawn = { id: number; kind: ResourceKind; pos: [number, number] };
const RESOURCES: ResourceSpawn[] = [
  // 樹（島嶼中內）
  { id: 1, kind: "wood", pos: [12, -8] },
  { id: 2, kind: "wood", pos: [16, 2] },
  { id: 3, kind: "wood", pos: [-14, -6] },
  { id: 4, kind: "wood", pos: [-10, 10] },
  { id: 5, kind: "wood", pos: [4, 14] },
  { id: 6, kind: "wood", pos: [-4, -16] },
  { id: 7, kind: "wood", pos: [18, 8] },
  { id: 8, kind: "wood", pos: [-18, 4] },
  // 水晶（島中心 / 燈塔附近）
  { id: 20, kind: "crystal", pos: [-22, -18] },
  { id: 21, kind: "crystal", pos: [22, -16] },
  { id: 22, kind: "crystal", pos: [0, 22] },
  { id: 23, kind: "crystal", pos: [-2, -22] },
  // 貝殼（靠海邊、半徑接近 island radius）
  { id: 40, kind: "shell", pos: [26, 8] },
  { id: 41, kind: "shell", pos: [-26, 6] },
  { id: 42, kind: "shell", pos: [10, 26] },
  { id: 43, kind: "shell", pos: [-12, -24] },
  { id: 44, kind: "shell", pos: [24, -14] },
  { id: 45, kind: "shell", pos: [-22, 18] },
];

// subscribeOpen / emitOpen / touchInput / consumeInteractPulse 從 ./island-bus import

// 用 ref 暫存 player 位置、避免 React state 60fps re-render
const playerPos = { x: 0, y: 1.1, z: 6 };
let activeNodeId: string | null = null;
const subscribers = new Set<(id: string | null) => void>();
function setActiveNode(id: string | null) {
  if (activeNodeId === id) return;
  activeNodeId = id;
  for (const s of subscribers) s(id);
}
function useActiveNode() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    subscribers.add(setId);
    return () => { subscribers.delete(setId); };
  }, []);
  return id;
}

type Quality = "low" | "med" | "high";
function readQualityLite(): Quality {
  if (typeof window === "undefined") return "med";
  try { return (localStorage.getItem("ai_island_quality") as Quality) || "med"; } catch { return "med"; }
}
function readFxLite(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem("ai_island_fx") !== "0"; } catch { return true; }
}

export default function IslandV0({
  completedChapterIds = [],
  level = 1,
  petName,
}: {
  completedChapterIds?: number[];
  level?: number;
  petName?: string | null;
}) {
  const quality = readQualityLite();
  const fxOn = readFxLite();
  // dpr 上限影響 fillrate（最省電 lever）
  const dpr: [number, number] = quality === "low" ? [0.6, 1] : quality === "med" ? [1, 1.5] : [1, 2];
  const useShadows = quality !== "low";
  const enablePost = fxOn && quality !== "low";

  return (
    <KeyboardControls
      map={[
        { name: K[K.forward], keys: ["KeyW", "ArrowUp"] },
        { name: K[K.back], keys: ["KeyS", "ArrowDown"] },
        { name: K[K.left], keys: ["KeyA", "ArrowLeft"] },
        { name: K[K.right], keys: ["KeyD", "ArrowRight"] },
        { name: K[K.run], keys: ["ShiftLeft", "ShiftRight"] },
        { name: K[K.interact], keys: ["KeyE", "Enter"] },
        { name: K[K.bag], keys: ["KeyB", "KeyI"] },
        { name: K[K.fish], keys: ["KeyF"] },
      ]}
    >
      <Canvas
        camera={{ position: [0, 1.6, 8], fov: 70 }}
        shadows={useShadows}
        dpr={dpr}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: quality !== "low", powerPreference: "low-power" }}
      >
        <Suspense fallback={null}>
          <Scene completedChapterIds={completedChapterIds} level={level} petName={petName ?? null} enablePost={enablePost} quality={quality} />
        </Suspense>
      </Canvas>
      <Hud />
    </KeyboardControls>
  );
}

function Scene({
  completedChapterIds,
  level,
  petName,
  enablePost,
  quality,
}: {
  completedChapterIds: number[];
  level: number;
  petName: string | null;
  enablePost: boolean;
  quality: Quality;
}) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <Ocean />
      <Island />
      <CentralTower />
      <SkyIsland />
      <Resources />
      <Chests />
      <PlayerHouse />
      <Village completed={completedChapterIds} />
      {level >= 5 && <Lighthouse />}
      {NODES.map((n) => (
        <Signpost key={n.id} node={n} />
      ))}
      <ZoneMarkers />
      <Player petName={petName} />
      <DayNightCycle />
      <WeatherFx />
      {enablePost && (
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.7} luminanceSmoothing={0.4} mipmapBlur />
          <Vignette eskil={false} offset={0.15} darkness={0.7} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
      {/* 第一人稱：點畫面 lock pointer、ESC 解鎖；手機改用 nipplejs 右側拖視角 */}
      <PointerLockControls makeDefault />
    </>
  );
}

function Village({ completed }: { completed: number[] }) {
  // 用螺旋排列、每完成一個章節升一棟房；最多顯示 30 棟
  const houses = completed.slice(0, 30).map((chId, i) => {
    const angle = i * 0.55;
    const r = 4 + i * 0.6;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r + 18;
    const variant = chId % 3;
    return { key: chId, x, z, variant };
  });
  return (
    <group>
      {houses.map((h) => (
        <House key={h.key} position={[h.x, 0, h.z]} variant={h.variant} />
      ))}
    </group>
  );
}

function House({ position, variant }: { position: [number, number, number]; variant: number }) {
  const wallColor = ["#d9c2a3", "#cfb89e", "#e6c7a6"][variant];
  const roofColor = ["#9c4f3a", "#7d5a2d", "#5c8a4a"][variant];
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1.4, 1.2, 1.4]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.1, 0.8, 4]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
      {/* 門 */}
      <mesh position={[0, 0.45, 0.71]}>
        <boxGeometry args={[0.3, 0.6, 0.02]} />
        <meshStandardMaterial color="#3a2715" />
      </mesh>
    </group>
  );
}

function Lighthouse() {
  return (
    <group position={[-22, 0, -22]}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.8, 4]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[0, 4.4, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#d23" />
      </mesh>
      <mesh position={[0, 5.0, 0]} castShadow>
        <coneGeometry args={[0.9, 0.6, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <pointLight position={[0, 4.4, 0]} color="#ffd700" intensity={2} distance={20} />
    </group>
  );
}

function Ocean() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#1f6fb4" transparent opacity={0.85} />
    </mesh>
  );
}

function Island() {
  return (
    <group>
      {/* 島嶼上層（草） */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS - 2, 1, 48]} />
        <meshStandardMaterial color="#3ea05a" />
      </mesh>
      {/* 沙岸 */}
      <mesh position={[0, -0.45, 0]} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS + 1.5, ISLAND_RADIUS + 0.5, 0.5, 48]} />
        <meshStandardMaterial color="#e6d49a" />
      </mesh>
      {/* 中央高地（任務大廳基座） */}
      <mesh position={[0, 0.6, 0]} receiveShadow>
        <cylinderGeometry args={[7, 8, 1.2, 24]} />
        <meshStandardMaterial color="#4a8b48" />
      </mesh>
      {/* 4 個分區的階梯路徑（從中央往外 8 方向） */}
      {[0, 1, 2, 3].map((i) => {
        const ang = i * Math.PI / 2 + Math.PI / 4;
        const len = ISLAND_RADIUS - 8;
        return (
          <mesh key={i} position={[Math.cos(ang) * (8 + len / 2), 0.55, Math.sin(ang) * (8 + len / 2)]} rotation={[0, -ang, 0]} receiveShadow>
            <boxGeometry args={[len, 0.05, 1.6]} />
            <meshStandardMaterial color="#c8b58a" />
          </mesh>
        );
      })}
    </group>
  );
}

// 中央水晶高塔（任務大廳）
function CentralTower() {
  return (
    <group position={[0, 1.2, 0]}>
      {/* 塔基 */}
      <mesh castShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[2.2, 3, 2, 8]} />
        <meshStandardMaterial color="#d0d5dd" />
      </mesh>
      {/* 中段 */}
      <mesh castShadow position={[0, 3.2, 0]}>
        <cylinderGeometry args={[1.7, 2, 2.4, 8]} />
        <meshStandardMaterial color="#e8edf3" />
      </mesh>
      {/* 上段 */}
      <mesh castShadow position={[0, 5, 0]}>
        <cylinderGeometry args={[1.2, 1.7, 1.6, 8]} />
        <meshStandardMaterial color="#f5f7fa" />
      </mesh>
      {/* 水晶尖頂 */}
      <mesh castShadow position={[0, 7, 0]} rotation={[0, performance.now() / 6000, 0]}>
        <octahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color="#8be9fd" emissive="#22d3ee" emissiveIntensity={1.2} metalness={0.8} roughness={0.05} transparent opacity={0.85} />
      </mesh>
      <pointLight position={[0, 7, 0]} color="#8be9fd" intensity={2.5} distance={18} />
      {/* 塔頂浮空文字 */}
      <Text position={[0, 9, 0]} fontSize={0.5} color="#fff" outlineWidth={0.04} outlineColor="#000">
        🏛️ 任務大廳
      </Text>
    </group>
  );
}

// 玩家小屋位置（島嶼東南、跟其他物件不撞）
const HOUSE_POS: [number, number] = [-6, 18];

function PlayerHouse() {
  const [house, setHouse] = useState(() => readHouseState());
  useEffect(() => subscribeHouse(setHouse), []);
  if (!house.builtAt) {
    // 還沒蓋：顯示木牌「我的家」
    return (
      <group position={[HOUSE_POS[0], 0.6, HOUSE_POS[1]]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.15, 1.2, 0.15]} />
          <meshStandardMaterial color="#6b3f1e" />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <boxGeometry args={[1.4, 0.5, 0.1]} />
          <meshStandardMaterial color="#c89a5a" />
        </mesh>
        <Text position={[0, 1.3, 0.06]} fontSize={0.22} color="#222" anchorX="center" anchorY="middle">
          🏠 我的家
        </Text>
        <Text position={[0, 0.95, 0.06]} fontSize={0.13} color="#7a5599" anchorX="center" anchorY="middle">
          按 E 蓋
        </Text>
      </group>
    );
  }
  // 已蓋：顯示小屋 mesh
  return (
    <group position={[HOUSE_POS[0], 0, HOUSE_POS[1]]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[2.4, 1.8, 2.4]} />
        <meshStandardMaterial color="#e6c7a6" />
      </mesh>
      <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.9, 1.2, 4]} />
        <meshStandardMaterial color="#9c4f3a" />
      </mesh>
      {/* 門 */}
      <mesh position={[0, 0.7, 1.21]}>
        <boxGeometry args={[0.5, 1, 0.05]} />
        <meshStandardMaterial color="#3a2715" />
      </mesh>
      {/* 窗 */}
      <mesh position={[-0.8, 1.1, 1.21]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color="#8be9fd" emissive="#8be9fd" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.8, 1.1, 1.21]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color="#8be9fd" emissive="#8be9fd" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, 3.2, 0]} fontSize={0.25} color="#fff" outlineWidth={0.02} outlineColor="#000">
        🏠 我的家
      </Text>
      <Text position={[0, 2.9, 0]} fontSize={0.16} color="#ffd700" outlineWidth={0.01} outlineColor="#000">
        按 E 進入
      </Text>
    </group>
  );
}

// 北方漂浮天空之巔
function SkyIsland() {
  return (
    <group position={[0, 14, -32]}>
      {/* 漂浮島基 */}
      <mesh castShadow>
        <coneGeometry args={[5, 4, 8]} />
        <meshStandardMaterial color="#7a9bc8" />
      </mesh>
      {/* 頂層草地 */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[4, 5, 1, 12]} />
        <meshStandardMaterial color="#5fb360" />
      </mesh>
      {/* 天空塔 */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.2, 3, 8]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow rotation={[0, performance.now() / 5000, 0]}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#bd93f9" emissive="#9333ea" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[0, 5.5, 0]} color="#bd93f9" intensity={1.5} distance={12} />
      <Text position={[0, 8, 0]} fontSize={0.6} color="#fff" outlineWidth={0.04} outlineColor="#000">
        ⛰️ 天穹之巔
      </Text>
      <Text position={[0, 7.2, 0]} fontSize={0.25} color="#bd93f9" outlineWidth={0.02} outlineColor="#000">
        AI 大師挑戰
      </Text>
    </group>
  );
}

// 區域編號標記（朝向參考圖的 1-10 概念）
function ZoneMarkers() {
  const zones = [
    { num: 1, label: "📚 章節 · 學習區",   pos: [12, 6, -8] as [number, number, number],   color: "#50fa7b" },
    { num: 2, label: "🎮 副本 · 任務區",   pos: [-12, 6, 2] as [number, number, number],   color: "#ff79c6" },
    { num: 3, label: "🏆 排行 · 競技區",   pos: [0, 6, -16] as [number, number, number],   color: "#ffd700" },
    { num: 4, label: "🗣️ 討論 · 社交區",   pos: [18, 6, 14] as [number, number, number],   color: "#8be9fd" },
    { num: 5, label: "✍️ 部落格 · 創作區", pos: [-20, 6, -12] as [number, number, number], color: "#bd93f9" },
    { num: 6, label: "🧙 商人 · 道具",     pos: [-14, 5, 18] as [number, number, number],  color: "#ffb86c" },
    { num: 7, label: "👴 任務 · 漁夫",     pos: [16, 5, 18] as [number, number, number],   color: "#fbbf24" },
    { num: 8, label: "🔮 占卜 · 運勢",     pos: [0, 5, 8] as [number, number, number],     color: "#ec4899" },
  ];
  return (
    <group>
      {zones.map((z) => (
        <group key={z.num} position={z.pos}>
          <Text fontSize={0.6} color={z.color} outlineWidth={0.05} outlineColor="#000">
            {z.num}
          </Text>
          <Text position={[0, -0.5, 0]} fontSize={0.22} color="#fff" outlineWidth={0.02} outlineColor="#000">
            {z.label}
          </Text>
        </group>
      ))}
    </group>
  );
}

// 天氣 — 每 5 分鐘隨機切換、Sky uniform + 光照強度跟著變。
const WEATHER_PERIOD_MS = 5 * 60 * 1000;
const WEATHER_POOL: Weather[] = ["sunny", "sunny", "sunny", "cloudy", "cloudy", "rainy", "snowy", "foggy"];

function WeatherFx() {
  useEffect(() => {
    const tick = () => {
      const w = WEATHER_POOL[Math.floor(Math.random() * WEATHER_POOL.length)];
      setWeather(w);
    };
    tick();
    let id: ReturnType<typeof setInterval> | null = setInterval(tick, WEATHER_PERIOD_MS);
    // tab 隱藏時 pause、回來再 resume（省電）
    const onVis = () => {
      if (document.hidden) {
        if (id) { clearInterval(id); id = null; }
      } else {
        if (!id) id = setInterval(tick, WEATHER_PERIOD_MS);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}

// （3D Rain 已移除、改 CSS overlay 在 WeatherOverlay 元件、零 GPU 開銷）

// 晝夜循環 — 一天 = 8 分鐘。0 = 日出、0.5 = 日落、1 = 夜晚。
const DAY_LENGTH_MS = 8 * 60 * 1000;

function DayNightCycle() {
  const skyRef = useRef<any>(null);
  const sunRef = useRef<THREE.Vector3>(new THREE.Vector3(100, 30, 100));
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const weatherRef = useRef<Weather>(getWeather());

  useEffect(() => subscribeWeather((s) => { weatherRef.current = s.kind; }), []);

  useFrame(() => {
    const t = (performance.now() % DAY_LENGTH_MS) / DAY_LENGTH_MS;
    const angle = t * Math.PI * 2;
    const sunHeight = Math.sin(angle);
    const sunX = Math.cos(angle) * 100;
    const sunY = sunHeight * 80;
    const sunZ = 50;
    sunRef.current.set(sunX, sunY, sunZ);

    // 天氣影響 Sky uniform
    const w = weatherRef.current;
    const isDay = sunHeight > 0;
    const turbBase = isDay ? 6 : 2;
    const rayBase = isDay ? 2 : 0.2;
    const turb = w === "cloudy" ? Math.max(turbBase, 18)
               : w === "rainy" ? Math.max(turbBase, 20)
               : w === "snowy" ? Math.max(turbBase, 12)
               : w === "foggy" ? Math.max(turbBase, 25)
               : turbBase;
    const ray = w === "sunny" ? rayBase : rayBase * 0.3;
    if (skyRef.current) {
      skyRef.current.material.uniforms.sunPosition.value.copy(sunRef.current);
      skyRef.current.material.uniforms.rayleigh.value = ray;
      skyRef.current.material.uniforms.turbidity.value = turb;
    }
    if (dirLightRef.current) {
      const weatherMult = w === "sunny" ? 1 : w === "cloudy" ? 0.55 : w === "snowy" ? 0.65 : w === "foggy" ? 0.4 : 0.35;
      dirLightRef.current.intensity = Math.max(0, sunHeight) * 1.2 * weatherMult;
      dirLightRef.current.position.set(sunX * 0.3, Math.max(5, sunY * 0.5), sunZ * 0.3);
    }
  });

  return (
    <>
      <Sky ref={skyRef as any} sunPosition={[100, 30, 50]} turbidity={6} rayleigh={2} />
      <directionalLight ref={dirLightRef} position={[20, 30, 10]} intensity={1.2} castShadow shadow-mapSize={[512, 512]} color="#fff5e1" />
      <hemisphereLight args={["#aacfff", "#3a2e1a", 0.3]} />
    </>
  );
}

// 採集物 — 樹 / 水晶 / 貝殼。每個有 cooldown、被採後消失、cooldown 結束後重生。
// availableUntil 用 module-level Map 跨 component 共享、player useFrame 直接讀寫。
const resourceDownUntil = new Map<number, number>(); // id → epoch ms

function isResourceAvailable(id: number): boolean {
  const until = resourceDownUntil.get(id);
  if (!until) return true;
  return performance.now() > until;
}

function harvest(id: number, kind: ResourceKind) {
  const meta = RESOURCE_META[kind];
  const mult = hasBuff("fast_respawn") ? 0.3 : 1;
  resourceDownUntil.set(id, performance.now() + meta.respawnSec * 1000 * mult);
  emitCollect({ kind, count: 1 });
  bumpQuest(kind, 1);
  // 成就進度
  if (kind === "wood") bumpAch("tree_lover", 1);
  if (kind === "crystal") bumpAch("crystal_hunter", 1);
  if (kind === "shell") bumpAch("shell_collector", 1);
  bumpAch("rich", RESOURCE_META[kind].rewardCoin);
  // 夜間採集（晝夜循環 sin angle < 0 = 夜）
  const t = (performance.now() % DAY_LENGTH_MS) / DAY_LENGTH_MS;
  if (Math.sin(t * Math.PI * 2) < 0) bumpAch("night_owl", 1);
}

async function openChestById(id: number, rewardCoin: number, opened: Set<number>) {
  if (opened.has(id)) return;
  // 樂觀更新：先標 + 加水晶（UI 立刻有反應）
  markChestOpen(id);
  addToInventory("crystal", 1);
  bumpAch("treasure_hunter", 1);
  // server 寫入失敗就 rollback（避免 client 已開但 z 幣沒入帳）
  try {
    const res = await fetch("/api/island/open-chest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chest_id: id, reward: rewardCoin }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok && j.error !== "already_claimed") {
      // rollback
      unmarkChestOpen(id);
      addToInventory("crystal", -1);
    }
  } catch {
    unmarkChestOpen(id);
    addToInventory("crystal", -1);
  }
}

// NPC 位置（XZ 座標）
const NPC_POS: Record<NpcId, [number, number]> = {
  elder: [16, 14],
  merchant: [-14, 14],
  seer: [0, 4],
};
const ELDER_POS = NPC_POS.elder;

function Chests() {
  const [opened, setOpened] = useState<Set<number>>(new Set());
  useEffect(() => {
    setOpened(readOpenedChests());
    return subscribeChests(setOpened);
  }, []);
  return (
    <group>
      {CHESTS.map((c) => {
        const isOpen = opened.has(c.id);
        return (
          <group key={c.id} position={[c.pos[0], 0.4, c.pos[1]]}>
            <Glb src={M.chest} scale={1.2} />
            {!isOpen && (
              <>
                <pointLight position={[0, 1.2, 0]} color="#ffd700" intensity={0.7} distance={3} />
                <Text position={[0, 1.5, 0]} fontSize={0.3} color="#ffd700" outlineWidth={0.02} outlineColor="#000">
                  🪅
                </Text>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Resources() {
  // 用 useFrame 取代 1 秒 setInterval、只在 availability 真的變了才 setState
  const [availability, setAvailability] = useState<boolean[]>(() => RESOURCES.map(() => true));
  const lastRef = useRef<boolean[]>(availability);
  useFrame(() => {
    const next = RESOURCES.map((r) => isResourceAvailable(r.id));
    const prev = lastRef.current;
    if (next.length !== prev.length || next.some((v, i) => v !== prev[i])) {
      lastRef.current = next;
      setAvailability(next);
    }
  });
  return (
    <group>
      {RESOURCES.map((r, i) => (
        <ResourceMesh key={r.id} spawn={r} available={availability[i] ?? true} />
      ))}
    </group>
  );
}

function ResourceMesh({ spawn, available }: { spawn: ResourceSpawn; available: boolean }) {
  const [x, z] = spawn.pos;
  if (spawn.kind === "wood") {
    return (
      <group position={[x, 0.5, z]}>
        {available ? <Glb src={M.treePine} scale={1.4} /> : (
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.3, 0.3, 0.2]} /><meshStandardMaterial color="#4a2f1a" /></mesh>
        )}
      </group>
    );
  }
  if (spawn.kind === "crystal") {
    return (
      <group position={[x, 0.4, z]}>
        {available ? (
          <group rotation={[0, performance.now() / 4000, 0]}>
            <Glb src={M.coinGold} scale={1.2} />
            <pointLight position={[0, 0.4, 0]} color="#8be9fd" intensity={0.4} distance={2.5} />
          </group>
        ) : (
          <mesh position={[0, -0.3, 0]}><boxGeometry args={[0.6, 0.1, 0.6]} /><meshStandardMaterial color="#5a6a7a" /></mesh>
        )}
      </group>
    );
  }
  // shell — 用 rocks.glb（沒專屬貝殼）+ 小尺寸
  return (
    <group position={[x, 0.05, z]}>
      {available ? <Glb src={M.rocks} scale={0.5} /> : (
        <mesh position={[0, -0.05, 0]}><circleGeometry args={[0.3, 12]} /><meshStandardMaterial color="#a89070" /></mesh>
      )}
    </group>
  );
}

function Signpost({ node }: { node: Node }) {
  const active = useActiveNode() === node.id;
  return (
    <group position={node.position}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.2, 2, 0.2]} />
        <meshStandardMaterial color="#6b3f1e" />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <boxGeometry args={[1.6, 0.6, 0.12]} />
        <meshStandardMaterial color={active ? "#ffd700" : "#c89a5a"} emissive={active ? "#ff9900" : "#000"} emissiveIntensity={active ? 0.4 : 0} />
      </mesh>
      <Text position={[0, 1.7, 0.07]} fontSize={0.3} color="#222" anchorX="center" anchorY="middle">
        {node.label}
      </Text>
      {active && (
        <Html position={[0, 2.6, 0]} center distanceFactor={10}>
          <div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap select-none">
            按 <kbd className="px-1 bg-white/20 rounded">E</kbd> 進入
          </div>
        </Html>
      )}
    </group>
  );
}

function Player({ petName }: { petName: string | null }) {
  const ref = useRef<THREE.Group>(null);
  const petRef = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls<string>();
  const { camera } = useThree();
  const eDownRef = useRef(false);
  const bDownRef = useRef(false);
  const fDownRef = useRef(false);
  const stepAccumRef = useRef(0);
  const lastPosRef = useRef<{ x: number; z: number } | null>(null);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    // tab 隱藏時不做 heavy work（瀏覽器本身會降到 1fps、但這層更保險）
    if (typeof document !== "undefined" && document.hidden) return;
    const keys = getKeys() as Record<string, boolean>;

    // 鍵盤輸入（W = +1 = 螢幕內、forward）
    let inX = 0, inY = 0;
    if (keys[K[K.forward]]) inY += 1;
    if (keys[K[K.back]]) inY -= 1;
    if (keys[K[K.left]]) inX -= 1;
    if (keys[K[K.right]]) inX += 1;

    // 手機搖桿輸入（覆蓋鍵盤、若有搖桿值）
    if (touchInput.x !== 0 || touchInput.y !== 0) {
      inX = touchInput.x;
      inY = touchInput.y;
    }

    if (inX !== 0 || inY !== 0) {
      // 相機正前方（投影到 XZ 平面）
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      const fl = fwd.length();
      if (fl < 0.001) { fwd.set(0, 0, -1); } else { fwd.divideScalar(fl); }
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);

      const move = new THREE.Vector3();
      move.addScaledVector(fwd, inY);
      move.addScaledVector(right, inX);
      move.normalize();

      const fast = keys[K[K.run]] || touchInput.run;
      const buffMult = hasBuff("speed") ? 1.5 : 1;
      const speed = (fast ? PLAYER_SPEED * RUN_MULT : PLAYER_SPEED) * buffMult;
      g.position.addScaledVector(move, speed * dt);

      const radial = Math.sqrt(g.position.x ** 2 + g.position.z ** 2);
      if (radial > ISLAND_RADIUS - 1.5) {
        const k = (ISLAND_RADIUS - 1.5) / radial;
        g.position.x *= k;
        g.position.z *= k;
      }
      g.rotation.y = Math.atan2(move.x, move.z);
    }

    // FPV：相機跟玩家頭部（眼睛高度 1.6m）
    camera.position.x = g.position.x;
    camera.position.y = 1.6;
    camera.position.z = g.position.z;

    // 手機右側拖視角：把 touchLook delta 加到 camera rotation（emulate PointerLock）
    if (touchLook.dx !== 0 || touchLook.dy !== 0) {
      const sens = 0.003;
      camera.rotation.order = "YXZ"; // yaw → pitch、避免 roll
      camera.rotation.y -= touchLook.dx * sens;
      camera.rotation.x -= touchLook.dy * sens;
      camera.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation.x));
      touchLook.dx = 0;
      touchLook.dy = 0;
    }
    // 累積走路距離（公尺、整數）→ 每 1m 上報一次 steps quest + 成就
    if (lastPosRef.current) {
      const ddx = g.position.x - lastPosRef.current.x;
      const ddz = g.position.z - lastPosRef.current.z;
      stepAccumRef.current += Math.sqrt(ddx * ddx + ddz * ddz);
      if (stepAccumRef.current >= 1) {
        const whole = Math.floor(stepAccumRef.current);
        bumpQuest("steps", whole);
        bumpAch("first_step", whole);
        bumpAch("marathon", whole);
        if (getWeather() === "rainy") bumpAch("storm_walker", whole);
        stepAccumRef.current -= whole;
      }
    }
    lastPosRef.current = { x: g.position.x, z: g.position.z };
    playerPos.x = g.position.x;
    playerPos.z = g.position.z;
    // 共享 world 位置給 Minimap
    playerWorldPos.x = g.position.x;
    playerWorldPos.z = g.position.z;
    playerWorldPos.rot = g.rotation.y;

    // 找最近的「可互動」物件：節點 OR 採集物 OR NPC
    let nearestNode: Node | null = null;
    let nearestResource: ResourceSpawn | null = null;
    let nearestNpc: NpcId | null = null;
    let nearestD2 = INTERACT_RADIUS * INTERACT_RADIUS;
    for (const n of NODES) {
      const dx = n.position[0] - g.position.x;
      const dz = n.position[2] - g.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearestNode = n;
        nearestResource = null;
        nearestNpc = null;
      }
    }
    for (const r of RESOURCES) {
      if (!isResourceAvailable(r.id)) continue;
      const dx = r.pos[0] - g.position.x;
      const dz = r.pos[1] - g.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearestResource = r;
        nearestNode = null;
        nearestNpc = null;
      }
    }
    for (const npc of Object.keys(NPC_POS) as NpcId[]) {
      const [nx, nz] = NPC_POS[npc];
      const dx = nx - g.position.x;
      const dz = nz - g.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearestNpc = npc;
        nearestNode = null;
        nearestResource = null;
      }
    }
    // 寶箱（未開的）
    let nearestChest: { id: number; rewardCoin: number } | null = null;
    {
      const opened = readOpenedChests();
      for (const c of CHESTS) {
        if (opened.has(c.id)) continue;
        const dx = c.pos[0] - g.position.x;
        const dz = c.pos[1] - g.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < nearestD2) {
          nearestD2 = d2;
          nearestChest = c;
          nearestNode = null;
          nearestResource = null;
          nearestNpc = null;
        }
      }
    }
    // 我的家
    let nearestHouse = false;
    {
      const dx = HOUSE_POS[0] - g.position.x;
      const dz = HOUSE_POS[1] - g.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearestHouse = true;
        nearestNode = null;
        nearestResource = null;
        nearestChest = null;
        nearestNpc = null;
      }
    }
    // 寵物近 → 也可互動
    let nearestPet = false;
    if (petRef.current && petName) {
      const dx = petRef.current.position.x - g.position.x;
      const dz = petRef.current.position.z - g.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < nearestD2) {
        nearestPet = true;
        nearestNpc = null;
        nearestNode = null;
        nearestResource = null;
      }
    }
    setActiveNode(nearestNode?.id ?? null);

    // 互動鍵（edge trigger）
    const ePressed = !!keys[K[K.interact]];
    const eEdge = (ePressed && !eDownRef.current) || consumeInteractPulse();
    if (eEdge) {
      if (nearestNode) emitOpen(nearestNode.id);
      else if (nearestResource) harvest(nearestResource.id, nearestResource.kind);
      else if (nearestChest) openChestById(nearestChest.id, nearestChest.rewardCoin, readOpenedChests());
      else if (nearestHouse) emitHouseOpen();
      else if (nearestNpc) {
        emitNpc(nearestNpc);
        noteNpcTalked(nearestNpc);
      }
      else if (nearestPet) emitPetTalk();
    }
    eDownRef.current = ePressed;

    // 背包鍵 B / I（edge trigger）
    const bPressed = !!keys[K[K.bag]];
    if (bPressed && !bDownRef.current) emitBagToggle();
    bDownRef.current = bPressed;

    // 釣魚鍵 F — 在沙岸範圍才生效
    const fPressed = !!keys[K[K.fish]];
    if (fPressed && !fDownRef.current) {
      const r = Math.sqrt(g.position.x ** 2 + g.position.z ** 2);
      if (r > ISLAND_RADIUS - 4 && r < ISLAND_RADIUS) emitFishing();
    }
    fDownRef.current = fPressed;

    // 寵物跟隨：lerp 到玩家後方
    const pet = petRef.current;
    if (pet) {
      const targetX = g.position.x - Math.sin(g.rotation.y) * 1.5;
      const targetZ = g.position.z - Math.cos(g.rotation.y) * 1.5;
      pet.position.x += (targetX - pet.position.x) * Math.min(1, dt * 3);
      pet.position.z += (targetZ - pet.position.z) * Math.min(1, dt * 3);
      const dx = g.position.x - pet.position.x;
      const dz = g.position.z - pet.position.z;
      if (dx * dx + dz * dz > 0.05) {
        pet.rotation.y = Math.atan2(dx, dz);
      }
      // 跳動
      pet.position.y = 0.4 + Math.abs(Math.sin(performance.now() / 200)) * 0.1;
    }
  });

  return (
    <>
      {/* 玩家身體不渲染（第一人稱看不到自己）、但保留 ref 控制位置與旋轉 */}
      <group ref={ref} position={[0, 0, 6]} visible={false} />

      {/* 寵物 */}
      {petName && (
        <group ref={petRef} position={[0, 0.1, 8]}>
          <Glb src={petGlbFor(petName)} scale={0.85} />
          <Text position={[0, 1.2, 0]} fontSize={0.18} color="#fff" outlineWidth={0.01} outlineColor="#000">
            {petName}
          </Text>
        </group>
      )}

      {/* NPCs */}
      <NpcElder />
      <NpcMerchant />
      <NpcSeer />
    </>
  );
}

function NpcMerchant() {
  const [x, z] = NPC_POS.merchant;
  return (
    <group position={[x, 0, z]}>
      <Glb src={M.charMerchant} scale={1.1} />
      <Text position={[0, 2.4, 0]} fontSize={0.2} color="#fff" outlineWidth={0.02} outlineColor="#000">🧙 神秘商人</Text>
      <Text position={[0, 2.15, 0]} fontSize={0.14} color="#8be9fd" outlineWidth={0.01} outlineColor="#000">賣道具、按 E</Text>
      <Text position={[0, 2.8, 0]} fontSize={0.4} color="#8be9fd" outlineWidth={0.02} outlineColor="#000">$</Text>
    </group>
  );
}

function NpcSeer() {
  const [x, z] = NPC_POS.seer;
  return (
    <group position={[x, 0, z]}>
      <Glb src={M.charSeer} scale={1.1} />
      {/* 水晶球漂浮在身旁 */}
      <mesh position={[0.55, 0.7, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#bd93f9" transparent opacity={0.7} emissive="#bd93f9" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[0.55, 0.7, 0]} color="#bd93f9" intensity={1} distance={3} />
      <Text position={[0, 2.4, 0]} fontSize={0.2} color="#fff" outlineWidth={0.02} outlineColor="#000">🔮 占卜師</Text>
      <Text position={[0, 2.15, 0]} fontSize={0.14} color="#ff79c6" outlineWidth={0.01} outlineColor="#000">每日運勢、按 E</Text>
      <Text position={[0, 2.8, 0]} fontSize={0.4} color="#ff79c6" outlineWidth={0.02} outlineColor="#000">?</Text>
    </group>
  );
}

function NpcElder() {
  return (
    <group position={[ELDER_POS[0], 0, ELDER_POS[1]]}>
      <Glb src={M.charElder} scale={1.1} />
      <Text position={[0, 2.4, 0]} fontSize={0.2} color="#fff" outlineWidth={0.02} outlineColor="#000">👴 漁夫長老</Text>
      <Text position={[0, 2.15, 0]} fontSize={0.14} color="#ffd700" outlineWidth={0.01} outlineColor="#000">今日有任務、按 E</Text>
      <Text position={[0, 2.8, 0]} fontSize={0.4} color="#ffd700" outlineWidth={0.02} outlineColor="#000">!</Text>
    </group>
  );
}

function Hud() {
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { if (alive) setShowHint(false); }, 6000);
    return () => { alive = false; clearTimeout(t); };
  }, []);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 hidden md:flex justify-center">
      <div className="pointer-events-auto rounded-xl bg-black/60 backdrop-blur text-white text-xs px-3 py-2 flex gap-3 items-center">
        <span>WASD 走動</span>
        <span className="opacity-50">·</span>
        <span>Shift 加速</span>
        <span className="opacity-50">·</span>
        <span>E 進入</span>
        <span className="opacity-50">·</span>
        <span>滑鼠拖曳轉視角</span>
        {showHint && <span className="ml-2 text-yellow-300">← 走到牌子下、按 E 進章節</span>}
      </div>
    </div>
  );
}
