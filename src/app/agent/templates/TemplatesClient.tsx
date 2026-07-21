"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import {
  TASK_TEMPLATES, CATEGORY_META, type TemplateCategory,
} from "@/lib/agent/task-templates";

const CATS = Object.keys(CATEGORY_META) as TemplateCategory[];

export function TemplatesClient() {
  const [cat, setCat] = useState<TemplateCategory | "all">("all");

  const list = cat === "all" ? TASK_TEMPLATES : TASK_TEMPLATES.filter((t) => t.category === cat);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <Link href={"/agent/office" as any} className="inline-flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 hover:text-violet-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> 回辦公室
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-bold text-black/85 dark:text-white/90 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-500" /> 生活助理範本
        </h1>
        <p className="text-sm text-black/55 dark:text-white/55 mt-1">
          點一下＝預填指令，你看過、補上內容再送出。分身島幫你查、幫你寫、幫你規劃。
        </p>
      </header>

      {/* 分類 tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setCat("all")}
          className={`px-3 py-1.5 rounded-full text-sm border transition ${cat === "all" ? "bg-violet-600 text-white border-violet-600" : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-violet-400/50"}`}>
          全部
        </button>
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${cat === c ? "bg-violet-600 text-white border-violet-600" : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-violet-400/50"}`}>
            {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      {/* 範本卡 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {list.map((t) => {
          const inner = (
            <div className="flex items-start gap-2.5">
              <span className="text-2xl leading-none">{t.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium flex flex-wrap items-center gap-1.5 text-black/80 dark:text-white/85">
                  {t.title}
                  {t.needsDevice && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">需電腦</span>}
                  {t.needsOAuth && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400">即將開放</span>}
                </div>
                <div className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">{t.hint}</div>
              </div>
              {!t.needsOAuth && <ArrowRight className="w-4 h-4 text-black/25 dark:text-white/25 shrink-0 mt-0.5" />}
            </div>
          );
          if (t.needsOAuth) {
            return (
              <div key={t.id} title="需連結外部帳號（Gmail / 行事曆），即將開放"
                className="rounded-xl border border-black/10 dark:border-white/10 p-3 opacity-50 cursor-not-allowed">
                {inner}
              </div>
            );
          }
          return (
            <Link key={t.id} href={`/agent?goal=${encodeURIComponent(t.goal)}` as any}
              className="rounded-xl border border-black/10 dark:border-white/10 p-3 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
              {inner}
            </Link>
          );
        })}
      </div>

      <p className="text-center text-xs text-black/35 dark:text-white/35 pt-6">
        分身島會照你的指令做、動到外部或花錢的動作會先問你；範本只是起點、內容你決定。
      </p>
    </div>
  );
}
