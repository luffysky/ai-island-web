"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Play, ChevronRight, MousePointerClick, Footprints, Hand, MapIcon } from "lucide-react";

const STORAGE_KEY = "ai_island_welcome_v1";

/**
 * 進入島嶼首次顯示「點畫面開始」+ 3 步教學
 * - 首次：顯示大標題 + 開始按鈕
 * - 後續：直接跳過
 */
export function WelcomeOverlay() {
  const t = useTranslations("island");
  const [phase, setPhase] = useState<"hidden" | "title" | "tutorial">("hidden");
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY) === "1";
      setPhase(seen ? "hidden" : "title");
    } catch {
      setPhase("title");
    }
  }, []);

  const startTutorial = () => setPhase("tutorial");
  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setPhase("hidden");
  };

  if (phase === "hidden") return null;

  if (phase === "title") {
    return (
      <div className="fixed inset-0 z-[60] bg-gradient-to-b from-black/85 via-black/70 to-black/85 flex flex-col items-center justify-center pointer-events-auto cursor-pointer" onClick={startTutorial}>
        <div className="text-center px-6 animate-[welcome-rise_1.2s_ease-out]">
          <div className="text-6xl md:text-9xl font-black text-white tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-2">
            AI Island
          </div>
          <div className="text-base md:text-2xl text-white/80 font-bold tracking-[0.4em] mb-12 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            {t("tagline")}
          </div>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/15 backdrop-blur border border-white/30 text-white text-sm md:text-base font-bold animate-pulse">
            <MousePointerClick size={18} />
            {t("tapToStart")}
          </div>
        </div>
        <style>{`@keyframes welcome-rise { 0% { opacity: 0; transform: translateY(40px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  // tutorial
  const steps = [
    {
      icon: <MousePointerClick size={32} />,
      title: t("step1Title"),
      desc: t("step1Desc"),
    },
    {
      icon: <Footprints size={32} />,
      title: t("step2Title"),
      desc: t("step2Desc"),
    },
    {
      icon: <Hand size={32} />,
      title: t("step3Title"),
      desc: t("step3Desc"),
    },
    {
      icon: <MapIcon size={32} />,
      title: t("step4Title"),
      desc: t("step4Desc"),
    },
  ];
  const cur = steps[step];
  const isLast = step >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center pointer-events-auto px-4">
      <div className="bg-bg-card border border-border rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center animate-[fade-in_300ms_ease-out]">
        <div className="text-[10px] text-fg-muted mb-3">{step + 1} / {steps.length}</div>
        <div className="text-accent mb-3 inline-flex">{cur.icon}</div>
        <h3 className="text-xl font-bold mb-2">{cur.title}</h3>
        <p className="text-sm text-fg-muted leading-relaxed mb-6">{cur.desc}</p>
        <div className="flex justify-between items-center gap-3">
          <button onClick={finish} className="text-xs text-fg-muted hover:text-fg">{t("skip")}</button>
          <button onClick={() => (isLast ? finish() : setStep(step + 1))} className="px-5 py-2 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1">
            {isLast ? <><Play size={14} /> {t("startExplore")}</> : <>{t("next")} <ChevronRight size={14} /></>}
          </button>
        </div>
      </div>
      <style>{`@keyframes fade-in { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}
