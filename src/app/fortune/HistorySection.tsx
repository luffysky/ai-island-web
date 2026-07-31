"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { History, Loader2, ChevronDown } from "lucide-react";

type DailyPayload = { overall: string; luckyColor: string; luckyNumber: number; tip: string; score?: number };
type IchingPayload = { gua?: { name?: string; question?: string }; reading?: { summary?: string; advice?: string } };
type HistItem = {
  date: string;
  daily?: DailyPayload;
  tarot?: { question: string; summary: string };
  iching?: IchingPayload;
};
type BaziEntry = { date: string; payload?: { chart?: any; reading?: { overview?: string } } };

export function HistorySection() {
  const t = useTranslations("fortune");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistItem[]>([]);
  const [bazi, setBazi] = useState<BaziEntry | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/fortune/history");
      const d = await r.json();
      setItems(d.history ?? []);
      setBazi(d.bazi ?? null);
    } catch { /* ignore */ } finally {
      setLoading(false); setLoaded(true);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) load();
  };

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
        <History className="w-5 h-5 text-violet-500 shrink-0" />
        <div className="flex-1 text-left">
          <div className="font-semibold text-black/80 dark:text-white/85">{t("history.title")}</div>
          <div className="text-xs text-black/50 dark:text-white/50">{t("history.subtitle")}</div>
        </div>
        <ChevronDown className={`w-5 h-5 text-black/35 dark:text-white/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50 py-4"><Loader2 className="w-4 h-4 animate-spin" /> {t("history.loading")}</div>
          ) : items.length === 0 && !bazi ? (
            <p className="text-sm text-black/45 dark:text-white/45 py-4 text-center">{t("history.empty")}</p>
          ) : (
            <div className="space-y-2">
              {/* 八字命盤（單張、依生日；置頂、明確標示、不再是裸日期） */}
              {bazi?.payload?.reading?.overview && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
                  <button onClick={() => setExpanded(expanded === "__bazi__" ? null : "__bazi__")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition text-left">
                    <span className="text-base shrink-0">🀄</span>
                    <span className="flex-1 text-sm font-medium text-black/70 dark:text-white/75 truncate">{t("history.baziLabel")}</span>
                    <span className="text-[11px] font-mono text-black/40 dark:text-white/40 shrink-0">{bazi.date}</span>
                    <ChevronDown className={`w-4 h-4 text-black/30 dark:text-white/30 shrink-0 transition-transform ${expanded === "__bazi__" ? "rotate-180" : ""}`} />
                  </button>
                  {expanded === "__bazi__" && (
                    <div className="px-3 pb-3 pt-1 text-sm text-black/70 dark:text-white/75 leading-relaxed">
                      {bazi.payload.reading.overview}
                    </div>
                  )}
                </div>
              )}
              {items.map((it) => {
                const isOpen = expanded === it.date;
                return (
                  <div key={it.date} className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    <button onClick={() => setExpanded(isOpen ? null : it.date)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition text-left">
                      <span className="text-sm font-mono text-black/55 dark:text-white/55 shrink-0">{it.date}</span>
                      <span className="flex-1 text-xs text-black/50 dark:text-white/50 truncate">
                        {it.daily?.overall ?? (it.tarot ? t("history.tarotLabel") : it.iching?.gua?.name ? t("history.ichingLabel") : "")}
                      </span>
                      {typeof it.daily?.score === "number" && (
                        <span className="text-xs font-semibold text-violet-500 shrink-0">{it.daily.score}</span>
                      )}
                      {it.tarot && <span className="text-xs shrink-0">🔮</span>}
                      {it.iching && <span className="text-xs shrink-0">☯️</span>}
                      <ChevronDown className={`w-4 h-4 text-black/30 dark:text-white/30 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 space-y-2 text-sm">
                        {it.daily && (
                          <>
                            <p className="text-black/70 dark:text-white/75 leading-relaxed">{it.daily.overall}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/50 dark:text-white/50">
                              <span>🎨 {it.daily.luckyColor}</span>
                              <span>🔢 {it.daily.luckyNumber}</span>
                            </div>
                            {it.daily.tip && <p className="text-xs text-amber-600 dark:text-amber-400">💡 {it.daily.tip}</p>}
                          </>
                        )}
                        {it.tarot && (
                          <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 p-2.5">
                            <p className="text-xs text-black/45 dark:text-white/45 mb-1">{t("history.tarotQuestion", { q: it.tarot.question })}</p>
                            <p className="text-black/70 dark:text-white/75 leading-relaxed text-[13px]">{it.tarot.summary}</p>
                          </div>
                        )}
                        {it.iching?.gua && (
                          <div className="rounded-lg bg-sky-500/5 border border-sky-500/15 p-2.5">
                            <p className="text-xs text-black/45 dark:text-white/45 mb-1">
                              ☯️ {it.iching.gua.name}{it.iching.gua.question ? `　·　${it.iching.gua.question}` : ""}
                            </p>
                            {it.iching.reading?.summary && (
                              <p className="text-black/70 dark:text-white/75 leading-relaxed text-[13px]">{it.iching.reading.summary}</p>
                            )}
                            {it.iching.reading?.advice && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">💡 {it.iching.reading.advice}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
