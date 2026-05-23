"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { subscribeNpc, readFortuneToday, rollFortune, type Fortune } from "./island-bus";

const TIER_COLOR: Record<Fortune["tier"], string> = {
  "大吉": "from-yellow-300 to-orange-400",
  "吉":   "from-emerald-300 to-green-500",
  "平":   "from-cyan-300 to-blue-500",
  "凶":   "from-purple-300 to-violet-500",
  "大凶": "from-pink-300 to-red-500",
};

export function SeerPanel() {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(readFortuneToday());
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeNpc((id) => {
    if (id === "seer") {
      setToday(readFortuneToday());
      setOpen(true);
    }
  }), []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!open) return null;

  const roll = async () => {
    if (today.result || busy) return;
    setBusy(true);
    const f = rollFortune();
    setToday({ date: today.date, result: f });
    // 若獎勵是 coin、打 server 領
    if (f.rewardKind === "coin") {
      try {
        await fetch("/api/island/claim-fortune", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: today.date, tier: f.tier, reward: f.reward }),
        });
      } catch {}
    }
    setBusy(false);
  };

  const r = today.result;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setOpen(false)}>
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-[92%] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2">🔮 占卜師</h2>
            <p className="text-[10px] text-fg-muted">「島民、看看你今日的星象」· {today.date}</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-bg-elevated"><X size={18} /></button>
        </header>

        <div className="p-5 flex flex-col items-center text-center">
          {r ? (
            <div className={`w-full rounded-xl p-5 bg-gradient-to-br ${TIER_COLOR[r.tier]} text-white shadow-lg`}>
              <div className="text-5xl mb-2">{r.emoji}</div>
              <div className="text-2xl font-black mb-1 tracking-widest">{r.tier}</div>
              <p className="text-xs leading-relaxed opacity-90">{r.message}</p>
              <div className="mt-3 text-[10px] bg-black/20 rounded-full px-3 py-1 inline-block">
                獎勵 +{r.reward} {r.rewardKind === "coin" ? "🪙" : r.rewardKind === "crystal" ? "💎" : "❤️"}
              </div>
            </div>
          ) : (
            <button
              onClick={roll}
              disabled={busy}
              className="w-full py-8 rounded-xl border-2 border-dashed border-accent/40 hover:border-accent hover:bg-accent/5 transition flex flex-col items-center gap-2"
            >
              {busy ? (
                <Loader2 size={30} className="animate-spin text-accent" />
              ) : (
                <>
                  <Sparkles size={30} className="text-accent" />
                  <span className="text-sm font-bold">翻今日運勢牌</span>
                  <span className="text-[10px] text-fg-muted">一天一次、明早再來</span>
                </>
              )}
            </button>
          )}
        </div>

        <footer className="px-5 py-2 border-t border-border text-[10px] text-fg-muted text-center">
          {r ? "明天再翻一次" : "點上面那張牌"}
        </footer>
      </div>
    </div>
  );
}
