"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { Sky, OrbitControls, KeyboardControls, useKeyboardControls, Text, Html } from "@react-three/drei";
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

enum K { forward, back, left, right, run, interact }

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

export default function IslandV0({
  completedChapterIds = [],
  level = 1,
  petName,
}: {
  completedChapterIds?: number[];
  level?: number;
  petName?: string | null;
}) {
  return (
    <KeyboardControls
      map={[
        { name: K[K.forward], keys: ["KeyW", "ArrowUp"] },
        { name: K[K.back], keys: ["KeyS", "ArrowDown"] },
        { name: K[K.left], keys: ["KeyA", "ArrowLeft"] },
        { name: K[K.right], keys: ["KeyD", "ArrowRight"] },
        { name: K[K.run], keys: ["ShiftLeft", "ShiftRight"] },
        { name: K[K.interact], keys: ["KeyE", "Enter"] },
      ]}
    >
      <Canvas
        camera={{ position: [0, 8, 14], fov: 55 }}
        shadows
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <Scene completedChapterIds={completedChapterIds} level={level} petName={petName ?? null} />
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
}: {
  completedChapterIds: number[];
  level: number;
  petName: string | null;
}) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <Ocean />
      <Island />
      <Resources />
      <Village completed={completedChapterIds} />
      {level >= 5 && <Lighthouse />}
      {NODES.map((n) => (
        <Signpost key={n.id} node={n} />
      ))}
      <Player petName={petName} />
      <DayNightCycle />
      <WeatherFx />
      <Rain />
      <OrbitControls enablePan={false} enableZoom maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={30} />
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
    </group>
  );
}

// 天氣 — 每 5 分鐘隨機切換、Sky uniform + 光照強度跟著變。
const WEATHER_PERIOD_MS = 5 * 60 * 1000;
const WEATHER_POOL: Weather[] = ["sunny", "sunny", "sunny", "cloudy", "cloudy", "rainy"];

function WeatherFx() {
  useEffect(() => {
    const tick = () => {
      const w = WEATHER_POOL[Math.floor(Math.random() * WEATHER_POOL.length)];
      setWeather(w);
    };
    tick();
    const i = setInterval(tick, WEATHER_PERIOD_MS);
    return () => clearInterval(i);
  }, []);
  return null;
}

const RAIN_COUNT = 800;
function Rain() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [weather, setW] = useState<Weather>(getWeather());
  useEffect(() => subscribeWeather(setW), []);

  // 初始化雨滴位置
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = Math.random() * 30 + 5;
      const z = (Math.random() - 0.5) * 60;
      m.setPosition(x, y, z);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, dt) => {
    if (weather !== "rainy") return;
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < RAIN_COUNT; i++) {
      mesh.getMatrixAt(i, m);
      const pos = new THREE.Vector3().setFromMatrixPosition(m);
      pos.y -= dt * 25;
      if (pos.y < 0) {
        pos.x = (Math.random() - 0.5) * 60;
        pos.y = 30;
        pos.z = (Math.random() - 0.5) * 60;
      }
      m.setPosition(pos);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, RAIN_COUNT]} visible={weather === "rainy"}>
      <boxGeometry args={[0.025, 0.4, 0.025]} />
      <meshBasicMaterial color="#9ec6ff" transparent opacity={0.7} />
    </instancedMesh>
  );
}

// 晝夜循環 — 一天 = 8 分鐘。0 = 日出、0.5 = 日落、1 = 夜晚。
const DAY_LENGTH_MS = 8 * 60 * 1000;

function DayNightCycle() {
  const skyRef = useRef<any>(null);
  const sunRef = useRef<THREE.Vector3>(new THREE.Vector3(100, 30, 100));
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const weatherRef = useRef<Weather>(getWeather());

  useEffect(() => subscribeWeather((w) => { weatherRef.current = w; }), []);

  useFrame(() => {
    const t = (performance.now() % DAY_LENGTH_MS) / DAY_LENGTH_MS;
    const angle = t * Math.PI * 2;
    const sunHeight = Math.sin(angle);
    const sunX = Math.cos(angle) * 100;
    const sunY = sunHeight * 80;
    const sunZ = 50;
    sunRef.current.set(sunX, sunY, sunZ);

    // 天氣影響：cloudy → turbidity 18 + rayleigh 0.5；rainy → turbidity 20 + rayleigh 0.3 + 整體更暗
    const w = weatherRef.current;
    const isDay = sunHeight > 0;
    const turbBase = isDay ? 6 : 2;
    const rayBase = isDay ? 2 : 0.2;
    const turb = w === "cloudy" ? Math.max(turbBase, 18) : w === "rainy" ? Math.max(turbBase, 20) : turbBase;
    const ray = w === "sunny" ? rayBase : rayBase * 0.3;
    if (skyRef.current) {
      skyRef.current.material.uniforms.sunPosition.value.copy(sunRef.current);
      skyRef.current.material.uniforms.rayleigh.value = ray;
      skyRef.current.material.uniforms.turbidity.value = turb;
    }
    if (dirLightRef.current) {
      const weatherMult = w === "sunny" ? 1 : w === "cloudy" ? 0.55 : 0.35;
      dirLightRef.current.intensity = Math.max(0, sunHeight) * 1.2 * weatherMult;
      dirLightRef.current.position.set(sunX * 0.3, Math.max(5, sunY * 0.5), sunZ * 0.3);
    }
  });

  return (
    <>
      <Sky ref={skyRef as any} sunPosition={[100, 30, 50]} turbidity={6} rayleigh={2} />
      <directionalLight ref={dirLightRef} position={[20, 30, 10]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} color="#fff5e1" />
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
}

// NPC 位置（XZ 座標）
const NPC_POS: Record<NpcId, [number, number]> = {
  elder: [16, 14],
  merchant: [-14, 14],
  seer: [0, 4],
};
const ELDER_POS = NPC_POS.elder;

function Resources() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <group>
      {RESOURCES.map((r) => (
        <ResourceMesh key={r.id} spawn={r} available={isResourceAvailable(r.id)} />
      ))}
    </group>
  );
}

function ResourceMesh({ spawn, available }: { spawn: ResourceSpawn; available: boolean }) {
  const [x, z] = spawn.pos;
  if (spawn.kind === "wood") {
    return (
      <group position={[x, 0.5, z]}>
        {available ? (
          <>
            <mesh position={[0, 0.7, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.3, 1.4]} />
              <meshStandardMaterial color="#7b4a1f" />
            </mesh>
            <mesh position={[0, 2, 0]} castShadow>
              <coneGeometry args={[1.1, 2.4, 8]} />
              <meshStandardMaterial color="#2d6a3a" />
            </mesh>
          </>
        ) : (
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2]} />
            <meshStandardMaterial color="#4a2f1a" />
          </mesh>
        )}
      </group>
    );
  }
  if (spawn.kind === "crystal") {
    return (
      <group position={[x, 0.4, z]}>
        {available ? (
          <mesh castShadow rotation={[0, performance.now() / 4000, 0]}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#8be9fd" emissive="#22d3ee" emissiveIntensity={0.4} metalness={0.6} roughness={0.1} />
          </mesh>
        ) : (
          <mesh position={[0, -0.3, 0]}>
            <boxGeometry args={[0.6, 0.1, 0.6]} />
            <meshStandardMaterial color="#5a6a7a" />
          </mesh>
        )}
      </group>
    );
  }
  // shell
  return (
    <group position={[x, 0.05, z]}>
      {available ? (
        <mesh castShadow rotation={[Math.PI / 6, 0, 0]}>
          <sphereGeometry args={[0.28, 12, 8, 0, Math.PI]} />
          <meshStandardMaterial color="#ffe1c4" roughness={0.5} side={2} />
        </mesh>
      ) : (
        <mesh position={[0, -0.05, 0]}>
          <circleGeometry args={[0.3, 12]} />
          <meshStandardMaterial color="#a89070" />
        </mesh>
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
  const stepAccumRef = useRef(0);
  const lastPosRef = useRef<{ x: number; z: number } | null>(null);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
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
    // 累積走路距離（公尺、整數）→ 每 1m 上報一次 steps quest
    if (lastPosRef.current) {
      const ddx = g.position.x - lastPosRef.current.x;
      const ddz = g.position.z - lastPosRef.current.z;
      stepAccumRef.current += Math.sqrt(ddx * ddx + ddz * ddz);
      if (stepAccumRef.current >= 1) {
        const whole = Math.floor(stepAccumRef.current);
        bumpQuest("steps", whole);
        stepAccumRef.current -= whole;
      }
    }
    lastPosRef.current = { x: g.position.x, z: g.position.z };
    playerPos.x = g.position.x;
    playerPos.z = g.position.z;

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
      else if (nearestNpc) emitNpc(nearestNpc);
      else if (nearestPet) emitPetTalk();
    }
    eDownRef.current = ePressed;

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
      <group ref={ref} position={[0, 1.1, 6]}>
        {/* 身體 */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.35, 0.8, 6, 12]} />
          <meshStandardMaterial color="#50fa7b" />
        </mesh>
        {/* 頭 */}
        <mesh castShadow position={[0, 1.4, 0]}>
          <sphereGeometry args={[0.32, 16, 16]} />
          <meshStandardMaterial color="#ffd9a8" />
        </mesh>
        {/* 朝向小錐 */}
        <mesh position={[0, 1.4, 0.4]}>
          <coneGeometry args={[0.06, 0.18, 8]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>

      {/* 寵物 */}
      {petName && (
        <group ref={petRef} position={[0, 0.4, 8]}>
          <mesh castShadow>
            <sphereGeometry args={[0.32, 16, 16]} />
            <meshStandardMaterial color="#ff79c6" />
          </mesh>
          {/* 眼 */}
          <mesh position={[0.12, 0.1, 0.28]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[-0.12, 0.1, 0.28]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <Text position={[0, 0.7, 0]} fontSize={0.18} color="#fff" outlineWidth={0.01} outlineColor="#000">
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
    <group position={[x, 0.4, z]}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.32, 0.7, 6, 12]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      <mesh castShadow position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#f5dcc4" />
      </mesh>
      {/* 帽子 */}
      <mesh castShadow position={[0, 1.55, 0]}>
        <coneGeometry args={[0.4, 0.4, 8]} />
        <meshStandardMaterial color="#5a2d0c" />
      </mesh>
      <Text position={[0, 2.0, 0]} fontSize={0.18} color="#fff" outlineWidth={0.01} outlineColor="#000">
        🧙 神秘商人
      </Text>
      <Text position={[0, 1.75, 0]} fontSize={0.13} color="#8be9fd" outlineWidth={0.01} outlineColor="#000">
        賣道具、按 E
      </Text>
      <Text position={[0, 2.4, 0]} fontSize={0.35} color="#8be9fd" outlineWidth={0.02} outlineColor="#000">
        $
      </Text>
    </group>
  );
}

function NpcSeer() {
  const [x, z] = NPC_POS.seer;
  return (
    <group position={[x, 0.4, z]}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.7, 6, 12]} />
        <meshStandardMaterial color="#7a5599" />
      </mesh>
      <mesh castShadow position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#f5dcc4" />
      </mesh>
      {/* 水晶球 */}
      <mesh position={[0.45, 0.6, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#bd93f9" transparent opacity={0.6} emissive="#bd93f9" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, 1.95, 0]} fontSize={0.18} color="#fff" outlineWidth={0.01} outlineColor="#000">
        🔮 占卜師
      </Text>
      <Text position={[0, 1.7, 0]} fontSize={0.13} color="#ff79c6" outlineWidth={0.01} outlineColor="#000">
        每日運勢、按 E
      </Text>
      <Text position={[0, 2.35, 0]} fontSize={0.35} color="#ff79c6" outlineWidth={0.02} outlineColor="#000">
        ?
      </Text>
    </group>
  );
}

function NpcElder() {
  return (
    <group position={[ELDER_POS[0], 0.4, ELDER_POS[1]]}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 6, 12]} />
        <meshStandardMaterial color="#a8b9d0" />
      </mesh>
      <mesh castShadow position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#f5dcc4" />
      </mesh>
      <Text position={[0, 1.9, 0]} fontSize={0.18} color="#fff" outlineWidth={0.01} outlineColor="#000">
        👴 漁夫長老
      </Text>
      <Text position={[0, 1.65, 0]} fontSize={0.13} color="#ffd700" outlineWidth={0.01} outlineColor="#000">
        今日有任務、按 E
      </Text>
      {/* 頭頂 ! 提示 */}
      <Text position={[0, 2.2, 0]} fontSize={0.35} color="#ffd700" outlineWidth={0.02} outlineColor="#000">
        !
      </Text>
    </group>
  );
}

function Hud() {
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(t);
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
