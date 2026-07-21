"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ChevronDown, Sparkles } from "lucide-react";

type Gua = { name: string; meaning: string; upper: string; lower: string; movingYao: string; question: string };
type Reading = { summary: string; advice: string };

export function IChingSection() {
  const t = useTranslations("fortune");
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [gua, setGua] = useState<Gua | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [casting, setCasting] = useState(false);

  const cast = async () => {
    if (casting) return;
    setCasting(true);
    try {
      const r = await fetch("/api/fortune/iching", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() || undefined }),
      });
      const d = await r.json();
      setGua(d.gua ?? null); setReading(d.reading ?? null);
    } catch { /* ignore */ } finally { setCasting(false); }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
        <span className="text-2xl shrink-0">☯️</span>
        <div className="flex-1 text-left">
          <div className="font-semibold text-black/80 dark:text-white/85">{t("iching.title")}</div>
          <div className="text-xs text-black/50 dark:text-white/50">{t("iching.subtitle")}</div>
        </div>
        <ChevronDown className={`w-5 h-5 text-black/35 dark:text-white/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 120))}
              placeholder={t("iching.placeholder")}
              className="w-full px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 text-black/80 dark:text-white/85 text-sm" />
            <button onClick={cast} disabled={casting}
              className="w-full py-2.5 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
              {casting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("iching.casting")}</> : <><Sparkles className="w-4 h-4" /> {gua ? t("iching.castAgain") : t("iching.cast")}</>}
            </button>
          </div>

          {gua && (
            <div className="space-y-3">
              {gua.question && <p className="text-xs text-black/45 dark:text-white/45">{t("iching.asked", { q: gua.question })}</p>}
              <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{gua.name}</div>
                <div className="flex items-center justify-center gap-3 mt-2 text-sm text-black/60 dark:text-white/60">
                  <span>{t("iching.upper")} <b>{gua.upper}</b></span>
                  <span>{t("iching.lower")} <b>{gua.lower}</b></span>
                  <span>{t("iching.moving")} <b>{gua.movingYao}</b></span>
                </div>
                <p className="mt-2 text-sm text-black/70 dark:text-white/75 leading-relaxed">{gua.meaning}</p>
              </div>
              {reading && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-2">
                  <p className="text-sm text-black/80 dark:text-white/85 leading-relaxed">{reading.summary}</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed flex gap-1.5">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />{reading.advice}
                  </p>
                </div>
              )}
            </div>
          )}
          <p className="text-center text-[11px] text-black/35 dark:text-white/35">{t("iching.disclaimer")}</p>
        </div>
      )}
    </div>
  );
}
