"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";
import {
  SHOP_ITEMS,
  type ResourceKind,
  RESOURCE_META,
  readInventory,
  addToInventory,
  subscribeNpc,
  subscribeCollect,
} from "./island-bus";

import { useOverlayRegister } from "@/lib/overlay-stack";
export function MerchantPanel() {
  const [open, setOpen] = useState(false);
  useOverlayRegister(open);
  const [inv, setInv] = useState<Record<ResourceKind, number>>({ wood: 0, crystal: 0, shell: 0 });
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); }, []);

  useEffect(() => subscribeNpc((id) => {
    if (id === "merchant") {
      setInv(readInventory());
      setOpen(true);
    }
  }), []);

  useEffect(() => subscribeCollect(() => setInv(readInventory())), []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!open) return null;

  const canAfford = (cost: Partial<Record<ResourceKind, number>>) => {
    for (const k of Object.keys(cost) as ResourceKind[]) {
      if ((inv[k] ?? 0) < (cost[k] ?? 0)) return false;
    }
    return true;
  };

  const buy = (item: typeof SHOP_ITEMS[number]) => {
    if (!canAfford(item.cost)) return;
    // 扣資源
    for (const k of Object.keys(item.cost) as ResourceKind[]) {
      addToInventory(k, -(item.cost[k] ?? 0));
    }
    setInv(readInventory());
    item.apply();
    setFlash(item.id);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(null), 900);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setOpen(false)}>
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-md w-[92%] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2">🧙 神秘商人</h2>
            <p className="text-[10px] text-fg-muted">「想要這些好東西嗎？拿你的資源來換吧」</p>
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
          <span className="text-fg-muted ml-auto">背包庫存</span>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {SHOP_ITEMS.map((item) => {
            const ok = canAfford(item.cost);
            const justBought = flash === item.id;
            return (
              <button
                key={item.id}
                disabled={!ok}
                onClick={() => buy(item)}
                className={`text-left rounded-xl border p-3 transition relative ${justBought ? "border-emerald-400 bg-emerald-500/10" : ok ? "border-border hover:border-accent bg-bg" : "border-border bg-bg opacity-50 cursor-not-allowed"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{item.emoji}</span>
                  <span className="font-bold text-sm flex-1">{item.label}</span>
                  {justBought && <Check size={14} className="text-emerald-400" />}
                </div>
                <p className="text-[10px] text-fg-muted mb-2">{item.desc}</p>
                <div className="text-[10px] text-yellow-300 font-mono">
                  {(Object.keys(item.cost) as ResourceKind[]).map((k) => (
                    <span key={k} className="mr-2">{item.cost[k]} {RESOURCE_META[k].emoji}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <footer className="px-5 py-2 border-t border-border text-[10px] text-fg-muted text-center">
          buff 30 秒 / 60 秒 / 10 分鐘不等、可在 HUD 上方看剩餘時間
        </footer>
      </div>
    </div>
  );
}
