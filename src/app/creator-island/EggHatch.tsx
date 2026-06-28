"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 碎片蛋 + 孵化動畫（framer-motion 自製、零外部依賴）。
 * onOpen 回傳新碎片；動畫：晃動 → 裂開閃光 → 星花迸發 → 顯示孵出的碎片標題。
 * 想換成 Lottie：把 <Egg/> 換成 <LottieIcon src="https://lottie.host/xxx.lottie" .../> 即可。
 */
export function EggHatch({ onOpen, disabled }: { onOpen: () => Promise<{ title?: string } | null>; disabled?: boolean }) {
  const [phase, setPhase] = useState<"idle" | "shake" | "burst" | "done">("idle");
  const [hatched, setHatched] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (phase !== "idle" && phase !== "done") return;
    setErr(null); setHatched(null); setPhase("shake");
    try {
      // 動畫與 API 並行；至少讓晃動跑 ~1.1s
      const [frag] = await Promise.all([onOpen(), new Promise((r) => setTimeout(r, 1100))]);
      setPhase("burst");
      setHatched(frag?.title ?? "新的靈感碎片");
      setTimeout(() => setPhase("done"), 1400);
    } catch (e: any) {
      setErr(e?.message ?? "開蛋失敗"); setPhase("idle");
    }
  }

  return (
    <button onClick={go} disabled={disabled || phase === "shake"}
      className="relative overflow-hidden text-left rounded-2xl p-4 bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/30 hover:border-amber-400 disabled:opacity-60 transition w-full">
      <div className="relative h-16 flex items-center">
        {/* 蛋 */}
        <AnimatePresence>
          {phase !== "burst" && (
            <motion.div
              key="egg"
              animate={phase === "shake" ? { rotate: [0, -12, 12, -12, 12, -8, 8, 0], y: [0, -2, 0, -2, 0] } : { rotate: 0 }}
              transition={phase === "shake" ? { duration: 1.1, ease: "easeInOut" } : { duration: 0.3 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-5xl origin-bottom"
            >🥚</motion.div>
          )}
        </AnimatePresence>
        {/* 迸發星花 */}
        <AnimatePresence>
          {phase === "burst" && (
            <>
              <motion.div key="flash" initial={{ scale: 0, opacity: 0.9 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.6 }}
                className="absolute left-2 w-12 h-12 rounded-full bg-amber-300/60 blur-md" />
              {["✨", "🌟", "💫", "⭐", "🎉"].map((s, i) => (
                <motion.span key={i} initial={{ x: 16, y: 8, opacity: 1, scale: 0.6 }}
                  animate={{ x: 16 + Math.cos((i / 5) * 6.28) * 46, y: 8 + Math.sin((i / 5) * 6.28) * 30, opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.9, ease: "easeOut" }} className="absolute text-xl">{s}</motion.span>
              ))}
              <motion.div key="hatch" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.25, type: "spring" }}
                className="text-5xl">🐣</motion.div>
            </>
          )}
        </AnimatePresence>
        <div className="ml-3">
          <div className="font-bold">{phase === "shake" ? "孵化中…" : phase === "burst" || phase === "done" ? "孵出來了！" : "今日碎片蛋"}</div>
          <div className="text-xs text-fg-muted">
            {err ? <span className="text-red-300">{err}</span>
              : hatched ? <span className="text-amber-200">「{hatched}」已落入碎片森林</span>
              : "沒靈感？敲開一顆，換個起點（花 1 Dust）"}
          </div>
        </div>
      </div>
    </button>
  );
}
