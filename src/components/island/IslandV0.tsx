"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { Sky, OrbitControls, KeyboardControls, useKeyboardControls, Text } from "@react-three/drei";
import * as THREE from "three";

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

enum K { forward, back, left, right, run }

export default function IslandV0() {
  return (
    <KeyboardControls
      map={[
        { name: K[K.forward], keys: ["KeyW", "ArrowUp"] },
        { name: K[K.back], keys: ["KeyS", "ArrowDown"] },
        { name: K[K.left], keys: ["KeyA", "ArrowLeft"] },
        { name: K[K.right], keys: ["KeyD", "ArrowRight"] },
        { name: K[K.run], keys: ["ShiftLeft", "ShiftRight"] },
      ]}
    >
      <Canvas
        camera={{ position: [0, 8, 14], fov: 55 }}
        shadows
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Hud />
    </KeyboardControls>
  );
}

function Scene() {
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
      <Signpost position={[8, 0, -4]} label="📚 章節" />
      <Signpost position={[-7, 0, 6]} label="🎮 副本" />
      <Signpost position={[0, 0, -12]} label="🏆 排行榜" />
      <Player />
      <OrbitControls enablePan={false} enableZoom maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={30} />
    </>
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

function Signpost({ position, label }: { position: [number, number, number]; label: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.2, 2, 0.2]} />
        <meshStandardMaterial color="#6b3f1e" />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <boxGeometry args={[1.6, 0.6, 0.12]} />
        <meshStandardMaterial color="#c89a5a" />
      </mesh>
      <Text position={[0, 1.7, 0.07]} fontSize={0.3} color="#222" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

function Player() {
  const ref = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls<string>();
  const { camera } = useThree();

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const keys = getKeys() as Record<string, boolean>;
    const dir = new THREE.Vector3();
    if (keys[K[K.forward]]) dir.z -= 1;
    if (keys[K[K.back]]) dir.z += 1;
    if (keys[K[K.left]]) dir.x -= 1;
    if (keys[K[K.right]]) dir.x += 1;
    if (dir.lengthSq() > 0) {
      dir.normalize();
      // 跟相機方向對齊（讓 W 永遠向相機前方）
      const yaw = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
      const rot = new THREE.Matrix4().makeRotationY(yaw + Math.PI);
      dir.applyMatrix4(rot);
      const speed = keys[K[K.run]] ? PLAYER_SPEED * RUN_MULT : PLAYER_SPEED;
      g.position.x += dir.x * speed * dt;
      g.position.z += dir.z * speed * dt;
      // clamp 在島內
      const radial = Math.sqrt(g.position.x ** 2 + g.position.z ** 2);
      if (radial > ISLAND_RADIUS - 1.5) {
        const k = (ISLAND_RADIUS - 1.5) / radial;
        g.position.x *= k;
        g.position.z *= k;
      }
      // 朝向移動方向
      g.rotation.y = Math.atan2(dir.x, dir.z);
    }
  });

  return (
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
        <span>WASD / 方向鍵 走動</span>
        <span className="opacity-50">·</span>
        <span>Shift 加速</span>
        <span className="opacity-50">·</span>
        <span>滑鼠拖曳轉視角 / 滾輪縮放</span>
        {showHint && <span className="ml-2 text-yellow-300">← 試試走到牌子下面</span>}
      </div>
    </div>
  );
}
