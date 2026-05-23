"use client";

import { useEffect, useRef, useState } from "react";
import { X, Anchor, Loader2 } from "lucide-react";
import { subscribeFishing, rollFish, addFish, FISH_META, type FishKind } from "./island-bus";
import { useToast } from "@/components/ui/Toast";
import { useOverlayRegister } from "@/lib/overlay-stack";

type Phase = "idle" | "waiting" | "bite" | "result";

/**
 * 走到沙岸按 F → 開釣魚 modal
 * - waiting：隨機 2-10 秒等魚上鉤
 * - bite：1.2 秒內按 F 抓住
 * - result：顯示捕獲的魚 + z 幣獎勵（call server）
 */
export function FishingMinigame() {
  const [open, setOpen] = useState(false);
  useOverlayRegister(open);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fish, setFish] = useState<FishKind | null>(null);
  const [coins, setCoins] = useState(0);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const biteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  const clearTimers = () => {
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
    waitTimerRef.current = null;
    biteTimerRef.current = null;
  };

  const start = () => {
    clearTimers();
    setFish(null);
    setCoins(0);
    setPhase("waiting");
    const f = rollFish();
    const meta = FISH_META[f];
    const wait = (meta.minSeconds + Math.random() * (meta.maxSeconds - meta.minSeconds)) * 1000;
    waitTimerRef.current = setTimeout(() => {
      setFish(f);
      setPhase("bite");
      // 1.2 秒抓住、否則跑掉
      biteTimerRef.current = setTimeout(() => {
        setPhase("result");
        setFish(null);
        toast.info("魚跑了 🐠");
      }, 1200);
    }, wait);
  };

  const tryCatch = async () => {
    if (phase !== "bite" || !fish) return;
    if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
    const f = fish;
    const meta = FISH_META[f];
    addFish(f, 1);
    setPhase("result");
    setCoins(meta.coinReward);
    // server 發 z 幣
    try {
      const res = await fetch("/api/island/catch-fish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fish: f }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "rate_limited") toast.warning("釣太快了、慢一點");
      }
    } catch {}
  };

  useEffect(() => subscribeFishing(() => {
    setOpen(true);
    start();
  }), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "f" || e.key === "F") { tryCatch(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, fish]);

  useEffect(() => () => clearTimers(), []);

  const close = () => {
    clearTimers();
    setOpen(false);
    setPhase("idle");
    setFish(null);
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={close}>
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-[92%] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><Anchor size={16} /> 海邊釣魚</h2>
          <button onClick={close} className="p-1 rounded hover:bg-bg-elevated"><X size={18} /></button>
        </header>
        <div className="p-6 flex flex-col items-center text-center min-h-[200px] justify-center">
          {phase === "waiting" && (
            <>
              <div className="text-5xl mb-3 animate-pulse">🎣</div>
              <p className="text-sm text-fg-muted">水面平靜、靜待魚兒上鉤...</p>
              <Loader2 size={20} className="mt-3 animate-spin text-accent" />
            </>
          )}
          {phase === "bite" && fish && (
            <>
              <div className="text-6xl mb-3 animate-bounce">{FISH_META[fish].emoji}</div>
              <div className="text-xl font-black text-yellow-300 animate-pulse">上鉤了！</div>
              <p className="text-xs text-fg-muted mt-2">立刻按 <kbd className="px-1.5 py-0.5 bg-bg-elevated rounded font-mono">F</kbd> 拉桿</p>
              <button onClick={tryCatch} className="mt-3 px-5 py-2 rounded-full bg-yellow-400 text-black font-bold animate-pulse">
                拉桿！
              </button>
            </>
          )}
          {phase === "result" && (
            <>
              {fish || coins > 0 ? (
                <>
                  <div className="text-5xl mb-2">{fish ? FISH_META[fish].emoji : "🎉"}</div>
                  <div className="text-lg font-bold">捕到 {fish ? FISH_META[fish].label : "魚"}！</div>
                  {coins > 0 && (
                    <div className="mt-1 text-xs text-yellow-300">+{coins} 🪙</div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-5xl mb-2">🐠</div>
                  <div className="text-sm">魚跑了、再來一次？</div>
                </>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={start} className="px-4 py-1.5 rounded-full bg-accent text-black font-bold text-sm">
                  再釣一次
                </button>
                <button onClick={close} className="px-4 py-1.5 rounded-full border border-border text-sm">
                  離開
                </button>
              </div>
            </>
          )}
        </div>
        <footer className="px-5 py-2 border-t border-border text-[10px] text-fg-muted text-center">
          機率：鯽 45% / 鯉 30% / 鮪 15% / 金 8% / 龍 2%
        </footer>
      </div>
    </div>
  );
}
