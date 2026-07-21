"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles, RefreshCw, WandSparkles } from "lucide-react";

type TarotCard = { id: string; name: string; reversed: boolean; position: string; meaning: string };
type Reading = { question: string; cards: TarotCard[]; summary: string; advice: string };
type Resp = { reading: Reading | null; canDraw?: boolean; paid?: boolean; error?: string; message?: string };

export function TarotSection() {
  const t = useTranslations("fortune");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [question, setQuestion] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [canDraw, setCanDraw] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [err, setErr] = useState("");

  const loadExisting = useCallback(async () => {
    try {
      const r = await fetch("/api/fortune/tarot");
      const d: Resp = await r.json();
      setReading(d.reading);
      setCanDraw(d.canDraw ?? true);
    } catch { /* ignore */ } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (open && !loaded) loadExisting();
  }, [open, loaded, loadExisting]);

  const draw = async () => {
    if (drawing) return;
    setDrawing(true); setErr("");
    try {
      const r = await fetch("/api/fortune/tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() || undefined }),
      });
      const d: Resp = await r.json();
      if (r.status === 429 && d.error === "daily_used") {
        if (d.reading) setReading(d.reading);
        setCanDraw(false);
        setErr(d.message || t("tarot.errDailyUsed"));
        setDrawing(false);
        return;
      }
      if (!r.ok || !d.reading) {
        setErr(d.message || t("tarot.errDrawFailed"));
        setDrawing(false);
        return;
      }
      setReading(d.reading);
      setCanDraw(d.canDraw ?? false);
    } catch {
      setErr(t("tarot.errNetwork"));
    } finally {
      setDrawing(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 dark:from-violet-500/10 dark:to-fuchsia-500/10 p-4 flex items-center gap-3 hover:border-violet-400/50 transition text-left">
        <span className="text-3xl">🔮</span>
        <div className="flex-1">
          <div className="font-semibold text-black/80 dark:text-white/85">{t("tarot.cardTitle")}</div>
          <div className="text-xs text-black/50 dark:text-white/50">{t("tarot.cardSubtitle")}</div>
        </div>
        <WandSparkles className="w-5 h-5 text-violet-500" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 dark:from-violet-500/10 dark:to-fuchsia-500/10 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔮</span>
        <h2 className="font-bold text-black/85 dark:text-white/90">{t("tarot.title")}</h2>
      </div>

      {!loaded ? (
        <div className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("tarot.shuffling")}
        </div>
      ) : (
        <>
          {(!reading || canDraw) && (
            <div className="space-y-2">
              <input value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
                placeholder={t("tarot.placeholder")}
                className="w-full px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 text-black/80 dark:text-white/85 text-sm" />
              <button onClick={draw} disabled={drawing}
                className="w-full py-2.5 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
                {drawing ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("tarot.sensing")}</> : <><Sparkles className="w-4 h-4" /> {reading ? t("tarot.drawAgain") : t("tarot.drawThree")}</>}
              </button>
            </div>
          )}
          {err && <p className="text-sm text-amber-600 dark:text-amber-400 text-center">{err}</p>}

          {reading && (
            <div className="space-y-3 pt-1">
              {reading.question && (
                <p className="text-xs text-black/45 dark:text-white/45">{t("tarot.asked", { q: reading.question })}</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {reading.cards.map((c, i) => (
                  <div key={i} className="rounded-xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 p-2.5 text-center">
                    <div className="text-[10px] text-violet-500 font-medium mb-1">{c.position}</div>
                    <div className="text-2xl mb-1">🃏</div>
                    <div className="text-xs font-semibold text-black/80 dark:text-white/85 leading-tight">{c.name}</div>
                    <div className={`text-[10px] mt-0.5 ${c.reversed ? "text-rose-500" : "text-emerald-500"}`}>{c.reversed ? t("tarot.reversed") : t("tarot.upright")}</div>
                  </div>
                ))}
              </div>
              {reading.cards.map((c, i) => (
                c.meaning ? (
                  <p key={i} className="text-sm leading-relaxed text-black/70 dark:text-white/70">
                    <span className="font-medium text-black/80 dark:text-white/85">{t("tarot.cardMeaningLabel", { position: c.position, name: c.name })}</span>{c.meaning}
                  </p>
                ) : null
              ))}
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3">
                <p className="text-sm leading-relaxed text-black/80 dark:text-white/85">{reading.summary}</p>
                <p className="text-sm leading-relaxed text-violet-600 dark:text-violet-300 mt-2 flex gap-1.5">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />{reading.advice}
                </p>
              </div>
              {!canDraw && (
                <p className="text-center text-xs text-black/40 dark:text-white/40 flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3" /> {t("tarot.freeAgainTomorrow")}
                </p>
              )}
            </div>
          )}
        </>
      )}
      <p className="text-center text-[11px] text-black/35 dark:text-white/35">{t("tarot.disclaimer")}</p>
    </div>
  );
}
