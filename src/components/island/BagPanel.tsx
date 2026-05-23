"use client";

import { useEffect, useState } from "react";
import { X, Package, Trophy, Clock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useOverlayRegister } from "@/lib/overlay-stack";
import {
  type ResourceKind,
  RESOURCE_META,
  readInventory,
  subscribeCollect,
  subscribeBagToggle,
  ACHIEVEMENTS,
  type AchievementId,
  readAchState,
  subscribeAch,
  markAchClaimed,
} from "./island-bus";

/**
 * B 鍵 / I 鍵打開完整背包面板（手機：tap inventory chip 也可）
 * - 三大區：採集物 / 成就 / 統計
 * - 成就可 claim z 幣
 */
export function BagPanel() {
  const [open, setOpen] = useState(false);
  useOverlayRegister(open);
  const [tab, setTab] = useState<"items" | "achievements">("items");
  const [inv, setInv] = useState<Record<ResourceKind, number>>({ wood: 0, crystal: 0, shell: 0 });
  const [ach, setAch] = useState(() => readAchState());
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => subscribeBagToggle(() => {
    setInv(readInventory());
    setAch(readAchState());
    setOpen((v) => !v);
  }), []);
  useEffect(() => subscribeCollect(() => setInv(readInventory())), []);
  useEffect(() => subscribeAch(setAch), []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!open) return null;

  const claim = async (id: AchievementId) => {
    const meta = ACHIEVEMENTS[id];
    if (!meta || !ach.unlocked[id] || ach.claimed[id]) return;
    setBusy(id);
    try {
      const res = await fetch("/api/island/claim-achievement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievement_id: id, reward: meta.reward }),
      });
      const j = await res.json();
      if (res.ok || j.error === "already_claimed") {
        setAch(markAchClaimed(id));
        if (res.ok) toast.success(`+${meta.reward} z 幣已入帳`);
      } else {
        toast.error(j.error ?? "領取失敗");
      }
    } catch {
      toast.error("網路錯誤、稍後再試");
    } finally { setBusy(null); }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setOpen(false)}>
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-[94%] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2"><Package size={16} /> 我的背包</h2>
            <p className="text-[10px] text-fg-muted">按 B / I / ESC 切換</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-bg-elevated"><X size={18} /></button>
        </header>

        <div className="flex gap-1 px-4 pt-3 text-xs">
          <button onClick={() => setTab("items")} className={`px-3 py-1.5 rounded-t-lg ${tab === "items" ? "bg-bg-elevated font-bold" : "text-fg-muted hover:text-fg"}`}>
            <Package size={11} className="inline mr-1" /> 物品
          </button>
          <button onClick={() => setTab("achievements")} className={`px-3 py-1.5 rounded-t-lg ${tab === "achievements" ? "bg-bg-elevated font-bold" : "text-fg-muted hover:text-fg"}`}>
            <Trophy size={11} className="inline mr-1" /> 成就 ({Object.values(ach.unlocked).filter(Boolean).length}/{Object.keys(ACHIEVEMENTS).length})
          </button>
        </div>

        <div className="overflow-y-auto p-4 bg-bg-elevated rounded-b-2xl flex-1">
          {tab === "items" ? (
            <div>
              <h3 className="text-xs font-bold mb-2 text-fg-muted">採集資源</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(Object.keys(RESOURCE_META) as ResourceKind[]).map((k) => (
                  <div key={k} className="bg-bg rounded-xl p-3 text-center">
                    <div className="text-3xl">{RESOURCE_META[k].emoji}</div>
                    <div className="text-sm font-bold mt-1">{inv[k] ?? 0}</div>
                    <div className="text-[10px] text-fg-muted">{RESOURCE_META[k].label}</div>
                    <div className="text-[9px] text-yellow-400 mt-0.5">+{RESOURCE_META[k].rewardCoin} 🪙/個</div>
                  </div>
                ))}
              </div>
              <h3 className="text-xs font-bold mb-2 text-fg-muted">總統計</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="走過總距離" value={`${ach.progress.marathon ?? 0} m`} />
                <Stat label="累計賺取（島嶼）" value={`${ach.progress.rich ?? 0} 🪙`} />
                <Stat label="開過寶箱" value={`${ach.progress.treasure_hunter ?? 0} / 5`} />
                <Stat label="跟 NPC 對話" value={`${(ach.talkedNpcs ?? []).length} / 3`} />
              </div>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {(Object.keys(ACHIEVEMENTS) as AchievementId[]).map((id) => {
                const meta = ACHIEVEMENTS[id];
                const prog = ach.progress[id] ?? 0;
                const unlocked = !!ach.unlocked[id];
                const claimed = !!ach.claimed[id];
                const pct = Math.min(100, Math.round((prog / meta.target) * 100));
                return (
                  <li key={id} className={`rounded-lg border ${claimed ? "border-emerald-500/40 bg-emerald-500/5" : unlocked ? "border-yellow-400/40 bg-yellow-400/5" : "border-border bg-bg"} p-2.5`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-2xl">{unlocked ? meta.emoji : "🔒"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold">{meta.label}</div>
                        <div className="text-[10px] text-fg-muted">{meta.desc}</div>
                      </div>
                      <span className="text-[10px] text-yellow-300 font-bold">+{meta.reward} 🪙</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${claimed ? "bg-emerald-400" : unlocked ? "bg-yellow-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-fg-muted w-12 text-right">{Math.min(prog, meta.target)}/{meta.target}</span>
                      {claimed ? (
                        <span className="text-[10px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded">已領</span>
                      ) : unlocked ? (
                        <button onClick={() => claim(id)} disabled={busy === id} className="text-[10px] px-2 py-0.5 bg-yellow-400 text-black font-bold rounded disabled:opacity-50">
                          {busy === id ? "..." : "領取"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-fg-muted px-2 py-0.5"><Clock size={9} className="inline" /></span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg rounded p-2">
      <div className="text-[10px] text-fg-muted">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
