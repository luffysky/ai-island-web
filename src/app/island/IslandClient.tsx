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

export default function IslandClient({
  completedChapterIds,
  level,
  petName,
}: {
  completedChapterIds: number[];
  level: number;
  petName: string | null;
}) {
  return (
    <div className="fixed inset-0 top-14 bg-black">
      <IslandV0 completedChapterIds={completedChapterIds} level={level} petName={petName} />
      <div className="absolute top-3 left-3 pointer-events-auto z-10 flex items-center gap-2">
        <Link href="/" className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-full bg-black/40 backdrop-blur">
          ← 離開
        </Link>
        <span className="text-xs text-white/60 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur">
          🏘️ 已建 {completedChapterIds.length} 棟 · ⭐ Lv {level}
          {petName && <> · 🐾 {petName}</>}
        </span>
      </div>
    </div>
  );
}
