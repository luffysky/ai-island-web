"use client";

import { useEffect, useState } from "react";
import { Coins, Package } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  type ResourceKind,
  RESOURCE_META,
  readInventory,
  addToInventory,
  resetInventory,
  subscribeCollect,
} from "./island-bus";

/**
 * 採集背包 HUD（右上）
 * - 即時顯示三種資源數量
 * - 飄字「+1 🪵」每次採集
 * - 一鍵兌換 z 幣（call /api/island/redeem）
 */
export function InventoryBag() {
  const [inv, setInv] = useState<Record<ResourceKind, number>>({ wood: 0, crystal: 0, shell: 0 });
  const [floats, setFloats] = useState<Array<{ id: number; text: string }>>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setInv(readInventory());
  }, []);

  useEffect(() => {
    return subscribeCollect((e) => {
      const meta = RESOURCE_META[e.kind];
      const next = addToInventory(e.kind, e.count);
      setInv(next);
      const id = Math.random();
      setFloats((f) => [...f, { id, text: `+${e.count} ${meta.emoji}` }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1400);
    });
  }, []);

  const totalReward =
    inv.wood * RESOURCE_META.wood.rewardCoin +
    inv.crystal * RESOURCE_META.crystal.rewardCoin +
    inv.shell * RESOURCE_META.shell.rewardCoin;

  const redeem = async () => {
    if (totalReward === 0 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/island/redeem", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inv),
      });
      const j = await res.json();
      if (res.ok) {
        setInv(resetInventory());
        const id = Math.random();
        setFloats((f) => [...f, { id, text: `+${j.coins ?? totalReward} 🪙 已入帳` }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2400);
      } else {
        toast.error(j.error ?? "兌換失敗");
      }
    } catch {
      toast.error("網路錯誤、稍後再試");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto" data-hud-right-anchor>
      <div className="bg-black/60 backdrop-blur rounded-xl px-3 py-2 text-white text-xs flex items-center gap-3">
        <Package size={13} className="text-yellow-300" />
        {(Object.keys(RESOURCE_META) as ResourceKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1" title={RESOURCE_META[k].label}>
            <span>{RESOURCE_META[k].emoji}</span>
            <span className="font-bold">{inv[k] ?? 0}</span>
          </span>
        ))}
        <button
          onClick={redeem}
          disabled={totalReward === 0 || busy}
          className="ml-2 px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          title="把全部資源換成 z 幣"
        >
          <Coins size={10} /> +{totalReward}
        </button>
      </div>
      {/* 飄字 */}
      <div className="relative h-0 w-32 pointer-events-none">
        {floats.map((f) => (
          <div
            key={f.id}
            className="absolute right-0 text-yellow-300 text-sm font-bold animate-[float_1.4s_ease-out_forwards] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          >
            {f.text}
          </div>
        ))}
      </div>
      <style>{`@keyframes float { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-30px);opacity:0} }`}</style>
    </div>
  );
}
