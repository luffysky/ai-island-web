"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

/** 遊玩畫面共用的「街機外框」：暗色格線背景 + 標題列 + 觀念/章節。各遊戲把內容塞 children。 */
export function QuestShell({ title, concept, chapterHref, stars, intro, children }: {
  title: string; concept: string; chapterHref?: string; stars: number; intro: string; children: ReactNode;
}) {
  const t = useTranslations("quest");
  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0a1226] via-[#0b1020] to-black" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(80,250,123,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(80,250,123,0.13) 1px, transparent 1px)", backgroundSize: "34px 34px", maskImage: "radial-gradient(ellipse at 50% 0%, #000 45%, transparent 88%)" }} />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 -z-10 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <Link href="/quest" className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1"><ArrowLeft size={14} /> {t("dungeonMap")}</Link>
          <div className="text-xs text-slate-400">{t("conceptLabel")}<b className="text-emerald-300">{concept}</b>{chapterHref && <> · <Link href={chapterHref} className="hover:text-white underline">{t("reviewChapter")}</Link></>}</div>
        </div>
        <h1 className="text-xl font-extrabold">{title} {stars > 0 && <span className="text-amber-400">{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>}</h1>
        <p className="text-sm text-slate-300/80 mt-1 mb-3">{intro}</p>
        {children}
      </div>
    </div>
  );
}

/** 遊玩畫面共用樣式 class（暗色玻璃面板、輸入框、提示/訊息）。 */
export const QS = {
  panel: "bg-white/[0.04] border border-white/10 rounded-2xl",
  editor: "w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:border-emerald-400/60 resize-none",
  ghostBtn: "inline-flex items-center gap-1 px-3 py-2 rounded-full border border-white/15 text-sm text-slate-300 hover:text-white hover:border-white/40",
  runBtn: "inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-40",
  hint: "text-xs bg-amber-400/10 border border-amber-400/25 rounded-xl p-3 whitespace-pre-wrap text-slate-200",
};
