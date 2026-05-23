"use client";

import { useEffect, useState } from "react";
import { X, Home, Hammer, Bed, Loader2 } from "lucide-react";
import {
  type ResourceKind,
  type FurnitureKind,
  RESOURCE_META,
  FURNITURE_META,
  readInventory,
  addToInventory,
  subscribeCollect,
  readHouseState,
  subscribeHouse,
  buildHouse,
  addFurniture,
  markSlept,
  getHouseBuildCost,
  subscribeHouseOpen,
} from "./island-bus";
import { useToast } from "@/components/ui/Toast";

/**
 * 「我的家」面板
 * - 未蓋：花 20 木 + 1 水晶蓋一棟
 * - 已蓋：可放家具（消耗資源）、可睡覺（每日一次補 +1 ❤️）
 */
import { useOverlayRegister } from "@/lib/overlay-stack";
export function HousePanel() {
  const [open, setOpen] = useState(false);
  useOverlayRegister(open);
  const [house, setHouse] = useState(() => readHouseState());
  const [inv, setInv] = useState<Record<ResourceKind, number>>({ wood: 0, crystal: 0, shell: 0 });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => subscribeHouseOpen(() => {
    setHouse(readHouseState());
    setInv(readInventory());
    setOpen(true);
  }), []);
  useEffect(() => subscribeHouse(setHouse), []);
  useEffect(() => subscribeCollect(() => setInv(readInventory())), []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!open) return null;

  const canAfford = (cost: Partial<Record<ResourceKind, number>>) => {
    return (Object.keys(cost) as ResourceKind[]).every((k) => (inv[k] ?? 0) >= (cost[k] ?? 0));
  };

  const payCost = (cost: Partial<Record<ResourceKind, number>>) => {
    (Object.keys(cost) as ResourceKind[]).forEach((k) => addToInventory(k, -(cost[k] ?? 0)));
    setInv(readInventory());
  };

  const build = () => {
    const cost = getHouseBuildCost();
    if (!canAfford(cost)) {
      toast.warning("資源不夠、繼續採集");
      return;
    }
    payCost(cost);
    buildHouse();
    toast.success("小屋落成！");
  };

  const place = (k: FurnitureKind) => {
    const meta = FURNITURE_META[k];
    if (!canAfford(meta.cost)) {
      toast.warning("資源不夠");
      return;
    }
    payCost(meta.cost);
    addFurniture(k);
    toast.success(`${meta.emoji} ${meta.label} 已放好`);
  };

  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const sleptToday = house.lastSleepDate === today;
  const hasBed = (house.furniture ?? []).includes("bed");

  const sleep = async () => {
    if (busy || sleptToday) return;
    if (!hasBed) {
      toast.warning("先蓋一張床吧");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/island/sleep", { method: "POST" });
      const j = await res.json();
      if (res.ok) {
        markSlept(today);
        toast.success("睡了一覺、補 +1 ❤️");
      } else if (j.error === "already_slept") {
        markSlept(today);
        toast.info("今天已經睡過了");
      } else {
        toast.error(j.error ?? "睡覺失敗");
      }
    } catch {
      toast.error("網路錯誤");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setOpen(false)}>
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-md w-[92%] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2"><Home size={16} /> 我的家</h2>
            <p className="text-[10px] text-fg-muted">收集資源 → 蓋小屋 → 擺家具 → 睡覺補血</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-bg-elevated"><X size={18} /></button>
        </header>

        {/* 庫存 chip */}
        <div className="px-4 pt-3 flex items-center gap-3 text-xs">
          {(Object.keys(RESOURCE_META) as ResourceKind[]).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span>{RESOURCE_META[k].emoji}</span>
              <span className="font-bold">{inv[k] ?? 0}</span>
            </span>
          ))}
        </div>

        <div className="p-4 overflow-y-auto">
          {!house.builtAt ? (
            <div className="text-center">
              <div className="text-5xl mb-3">🏗️</div>
              <h3 className="font-bold mb-1">還沒有小屋</h3>
              <p className="text-xs text-fg-muted mb-4">花 {getHouseBuildCost().wood} 🪵 + {getHouseBuildCost().crystal} 💎 蓋一棟</p>
              <button
                onClick={build}
                disabled={!canAfford(getHouseBuildCost())}
                className="px-5 py-2 rounded-full bg-accent text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                <Hammer size={14} /> 蓋小屋
              </button>
              {!canAfford(getHouseBuildCost()) && (
                <p className="text-[10px] text-fg-muted mt-2">資源不夠、繼續採集</p>
              )}
            </div>
          ) : (
            <>
              {/* 內部 2D 平面圖 */}
              <div className="rounded-lg bg-gradient-to-br from-amber-100/10 to-amber-200/5 border border-amber-700/30 p-4 mb-3 min-h-[140px] flex flex-wrap gap-2 items-start content-start">
                {(house.furniture ?? []).length === 0 ? (
                  <div className="w-full text-center text-fg-muted text-xs py-8">空蕩蕩的房間、買點家具吧</div>
                ) : (
                  (house.furniture ?? []).map((k, i) => (
                    <div key={i} className="text-3xl" title={FURNITURE_META[k].label}>{FURNITURE_META[k].emoji}</div>
                  ))
                )}
              </div>

              {/* 睡覺按鈕 */}
              <button
                onClick={sleep}
                disabled={busy || sleptToday || !hasBed}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 mb-3"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Bed size={14} />}
                {sleptToday ? "今天已睡過" : !hasBed ? "先蓋一張床" : "睡覺（+1 ❤️）"}
              </button>

              {/* 家具商店 */}
              <h3 className="text-xs font-bold mb-2 text-fg-muted">添購家具</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(FURNITURE_META) as FurnitureKind[]).map((k) => {
                  const meta = FURNITURE_META[k];
                  const ok = canAfford(meta.cost);
                  return (
                    <button
                      key={k}
                      disabled={!ok}
                      onClick={() => place(k)}
                      className={`text-left p-2 rounded-lg border ${ok ? "border-border hover:border-accent bg-bg" : "border-border bg-bg opacity-50 cursor-not-allowed"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{meta.emoji}</span>
                        <span className="text-sm font-bold flex-1">{meta.label}</span>
                      </div>
                      <div className="text-[10px] text-yellow-300 font-mono">
                        {(Object.keys(meta.cost) as ResourceKind[]).map((k2) => (
                          <span key={k2} className="mr-2">{meta.cost[k2]} {RESOURCE_META[k2].emoji}</span>
                        ))}
                      </div>
                      {meta.effect && <div className="text-[10px] text-fg-muted mt-0.5">{meta.effect}</div>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
