"use client";

import { useEffect, useState } from "react";
import { X, Trophy, Check, Coins, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useOverlayRegister } from "@/lib/overlay-stack";
import {
  TODAY_QUESTS,
  readQuestState,
  subscribeQuest,
  subscribeNpc,
  markClaimed,
} from "./island-bus";

/**
 * 漁夫長老的每日任務面板
 * - 走近 NPC 按 E → emitNpc("elder") → 開這個面板
 * - 顯示 4 個任務進度條
 * - 完成可 claim → 打 /api/island/claim-quest 領 z 幣
 */
export function QuestPanel() {
  const [open, setOpen] = useState(false);
  useOverlayRegister(open);
  const [state, setState] = useState(() => readQuestState());
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    return subscribeNpc((id) => {
      if (id === "elder") {
        setState(readQuestState());
        setOpen(true);
      }
    });
  }, []);

  useEffect(() => subscribeQuest(setState), []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!open) return null;

  const claim = async (id: string) => {
    const q = TODAY_QUESTS.find((x) => x.id === id);
    if (!q) return;
    setBusy(id);
    try {
      const res = await fetch("/api/island/claim-quest", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest_id: id, reward: q.reward, date: state.date }),
      });
      const j = await res.json();
      if (res.ok || j.error === "already_claimed") {
        setState(markClaimed(id));
        if (res.ok) toast.success(`+${q.reward} z 幣已入帳`);
      } else {
        toast.error(j.error ?? "領取失敗");
      }
    } catch {
      toast.error("網路錯誤、稍後再試");
    } finally {
      setBusy(null);
    }
  };

  const allDone = TODAY_QUESTS.every((q) => (state.progress[q.id] ?? 0) >= q.target);
  const allClaimed = TODAY_QUESTS.every((q) => state.claimed[q.id]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-md w-[92%] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2">👴 漁夫長老</h2>
            <p className="text-[10px] text-fg-muted">「島民、來看看今日的任務」· {state.date}</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-bg-elevated" aria-label="關閉">
            <X size={18} />
          </button>
        </header>

        <div className="p-4 space-y-2">
          {TODAY_QUESTS.map((q) => {
            const prog = state.progress[q.id] ?? 0;
            const done = prog >= q.target;
            const claimed = !!state.claimed[q.id];
            const pct = Math.min(100, Math.round((prog / q.target) * 100));
            return (
              <div key={q.id} className={`rounded-xl border ${claimed ? "border-emerald-500/40 bg-emerald-500/5" : done ? "border-yellow-400/40 bg-yellow-400/5" : "border-border bg-bg"} p-3`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{q.emoji}</span>
                  <span className="font-medium text-sm flex-1">{q.label}</span>
                  <span className="text-[10px] text-fg-muted">{Math.min(prog, q.target)} / {q.target}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-bold flex items-center gap-0.5">
                    <Coins size={9} /> {q.reward}
                  </span>
                </div>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-2">
                  <div className={`h-full transition-all ${claimed ? "bg-emerald-400" : done ? "bg-yellow-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                </div>
                {claimed ? (
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1"><Check size={11} /> 已領取</div>
                ) : done ? (
                  <button
                    onClick={() => claim(q.id)}
                    disabled={busy === q.id}
                    className="w-full text-xs py-1.5 rounded-lg bg-yellow-400 text-black font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {busy === q.id ? <Loader2 size={12} className="animate-spin" /> : <Trophy size={12} />}
                    領取 {q.reward} 🪙
                  </button>
                ) : (
                  <div className="text-[10px] text-fg-muted">還差 {q.target - prog}</div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="px-5 py-3 border-t border-border text-[10px] text-fg-muted text-center">
          {allClaimed ? "今日任務全領完、明早再來" : allDone ? "所有任務完成、上面領獎" : "完成任務回來找我"}
        </footer>
      </div>
    </div>
  );
}
