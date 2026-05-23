"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const IslandV0 = dynamic(() => import("@/components/island/IslandV0"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-fg-muted">🏝️ 載入島嶼中…</div>
    </div>
  ),
});

/**
 * S7-S8 批 1：能站上去的島。
 * 之後批次會加進入節點、進度連動村莊、NPC、寵物跟隨。
 */
export default function IslandPage() {
  return (
    <div className="fixed inset-0 top-14 bg-black">
      <IslandV0 />
      <div className="absolute top-3 left-3 pointer-events-auto">
        <Link href="/" className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-full bg-black/40 backdrop-blur">
          ← 離開島嶼
        </Link>
      </div>
    </div>
  );
}
