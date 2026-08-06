"use client";
// /daily 兩個「站內資料」widget：AI Dot 餘額（/api/me/ai-quota）+ 今日學習任務（/api/me/next-lesson）。
// 登入者才顯示；抓失敗靜默不擋版。
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, GraduationCap, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Quota = { unlimited?: boolean; premium?: boolean; cap: number; used?: number; remaining: number };
type NextLesson = { chapter_id: number; chapter_title: string; lesson_id: string; lesson_title: string; reason?: string };

export function LearningStatusWidgets() {
  const { status } = useAuth();
  const [quota, setQuota] = useState<Quota | null>(null);
  const [next, setNext] = useState<NextLesson | null | undefined>(undefined); // undefined=未載, null=已載但無

  useEffect(() => {
    if (status !== "in") return;
    let cancelled = false;
    (async () => {
      try {
        const [q, n] = await Promise.all([
          fetch("/api/me/ai-quota").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/me/next-lesson").then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;
        if (q && !q.error) setQuota(q);
        setNext(n?.recommendation ?? null);
      } catch { /* 靜默 */ }
    })();
    return () => { cancelled = true; };
  }, [status]);

  if (status !== "in") return null;

  return (
    <>
      {/* AI Dot 餘額 */}
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-4">
        <div className="text-xs font-semibold text-black/55 dark:text-white/55 inline-flex items-center gap-1.5 mb-2"><Zap className="w-4 h-4" /> AI 額度</div>
        {quota ? (
          quota.unlimited ? (
            <>
              <p className="text-xl font-bold text-sky-700 dark:text-sky-300">無限 ✨</p>
              <p className="text-xs text-black/55 dark:text-white/55 mt-1">{quota.premium ? "訂閱中，AI 對話不限次" : "你有無限額度"}</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-sky-700 dark:text-sky-300">{quota.remaining}</span>
                <span className="text-sm text-black/55 dark:text-white/55">/ {quota.cap} 次今日剩餘</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-sky-500" style={{ width: `${Math.round((quota.remaining / Math.max(1, quota.cap)) * 100)}%` }} />
              </div>
              <Link href={"/settings/ai-keys" as any} className="inline-block text-xs text-sky-600 dark:text-sky-400 mt-2 hover:underline">用完了？自帶 API key 免限制 →</Link>
            </>
          )
        ) : (
          <p className="text-sm text-black/40 dark:text-white/40">載入中…</p>
        )}
      </div>

      {/* 今日學習任務 */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="text-xs font-semibold text-black/55 dark:text-white/55 inline-flex items-center gap-1.5 mb-2"><GraduationCap className="w-4 h-4" /> 今日學習任務</div>
        {next === undefined ? (
          <p className="text-sm text-black/40 dark:text-white/40">載入中…</p>
        ) : next ? (
          <Link href={`/chapters/${next.chapter_id}#lesson-${next.lesson_id}` as any} className="block group">
            <p className="text-xs text-black/50 dark:text-white/50">{next.chapter_title}</p>
            <p className="text-base font-bold text-black/85 dark:text-white/90 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">{next.lesson_title}</p>
            {next.reason && <p className="text-xs text-black/55 dark:text-white/55 mt-1 line-clamp-2">{next.reason}</p>}
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">接續學 <ArrowRight className="w-3 h-3" /></span>
          </Link>
        ) : (
          <>
            <p className="text-base font-bold text-black/85 dark:text-white/90">全部課程都完成了 🎉</p>
            <Link href={"/chapters" as any} className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">複習或探索其他章節 <ArrowRight className="w-3 h-3" /></Link>
          </>
        )}
      </div>
    </>
  );
}
