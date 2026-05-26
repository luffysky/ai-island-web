"use client";

import { useEffect, useState } from "react";
import { X, Gift, Check } from "lucide-react";
import {
  type VillagerId,
  VILLAGERS,
  subscribeVillager,
  hasGreetedToday,
  markGreetedToday,
} from "./island-bus";
import { useToast } from "@/components/ui/Toast";
import { useOverlayRegister } from "@/lib/overlay-stack";

export function VillagerTalk() {
  const [open, setOpen] = useState<VillagerId | null>(null);
  useOverlayRegister(open !== null);
  const [line, setLine] = useState("");
  const [claimed, setClaimed] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => subscribeVillager((id) => {
    const v = VILLAGERS.find((x) => x.id === id);
    if (!v) return;
    setLine(v.greeting[Math.floor(Math.random() * v.greeting.length)]);
    setClaimed(hasGreetedToday(id));
    setOpen(id);
  }), []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!open) return null;
  const v = VILLAGERS.find((x) => x.id === open);
  if (!v) return null;

  const claim = async () => {
    if (busy || claimed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/island/villager-greet", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villager_id: v.id }),
      });
      const j = await res.json();
      if (res.ok || j.error === "already_claimed") {
        markGreetedToday(v.id);
        setClaimed(true);
        if (res.ok) toast.success(`+${v.dailyReward} z 幣已入帳`);
      } else {
        toast.error(j.error ?? "領取失敗");
      }
    } catch { toast.error("網路錯誤"); }
    finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setOpen(null)}>
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-[92%]" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2">{v.emoji} {v.name}</h2>
            <p className="text-[10px] text-fg-muted">{v.role}</p>
          </div>
          <button onClick={() => setOpen(null)} className="p-1 rounded hover:bg-bg-elevated"><X size={18} /></button>
        </header>
        <div className="p-5 text-center">
          <p className="text-sm mb-4 leading-relaxed">{line}</p>
          <button
            onClick={claim}
            disabled={claimed || busy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
          >
            {claimed ? <><Check size={14} /> 今日已領</> : <><Gift size={14} /> 領今日 +{v.dailyReward} 🪙</>}
          </button>
        </div>
      </div>
    </div>
  );
}
