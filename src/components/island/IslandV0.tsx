"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { Sky, OrbitControls, KeyboardControls, useKeyboardControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  type IslandNodeId,
  subscribeOpen as _sub,
  emitOpen,
  touchInput,
  consumeInteractPulse,
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
      <Sky sunPosition={[100, 30, 100]} turbidity={6} rayleigh={2} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Ocean />
      <Island />
      <Trees />
      <Village completed={completedChapterIds} />
      {level >= 5 && <Lighthouse />}
      {NODES.map((n) => (
        <Signpost key={n.id} node={n} />
      ))}
      <Player petName={petName} />
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

function Trees() {
  const positions: [number, number][] = [
    [12, -8], [16, 2], [-14, -6], [-10, 10], [4, 14], [-4, -16], [18, 8], [-18, 4],
  ];
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0.5, z]} castShadow>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.25, 0.3, 1.4]} />
            <meshStandardMaterial color="#7b4a1f" />
          </mesh>
          <mesh position={[0, 2, 0]} castShadow>
            <coneGeometry args={[1.1, 2.4, 8]} />
            <meshStandardMaterial color="#2d6a3a" />
          </mesh>
        </group>
      ))}
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
      const speed = fast ? PLAYER_SPEED * RUN_MULT : PLAYER_SPEED;
      g.position.addScaledVector(move, speed * dt);

      const radial = Math.sqrt(g.position.x ** 2 + g.position.z ** 2);
      if (radial > ISLAND_RADIUS - 1.5) {
        const k = (ISLAND_RADIUS - 1.5) / radial;
        g.position.x *= k;
        g.position.z *= k;
      }
      g.rotation.y = Math.atan2(move.x, move.z);
    }
    playerPos.x = g.position.x;
    playerPos.z = g.position.z;

    // 找最近的節點（在互動半徑內）
    let nearest: Node | null = null;
    let nearestD2 = INTERACT_RADIUS * INTERACT_RADIUS;
    for (const n of NODES) {
      const dx = n.position[0] - g.position.x;
      const dz = n.position[2] - g.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearest = n;
      }
    }
    setActiveNode(nearest?.id ?? null);

    // 互動鍵（edge trigger）— 不跳走、廣播開島內 modal
    const ePressed = !!keys[K[K.interact]];
    const eEdge = (ePressed && !eDownRef.current) || consumeInteractPulse();
    if (eEdge && nearest) {
      emitOpen(nearest.id);
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

      {/* 簡易 NPC — 海岸老人 */}
      <NpcElder />
    </>
  );
}

function NpcElder() {
  return (
    <group position={[16, 0.4, 14]}>
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
        歡迎來島上，新手
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
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
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
