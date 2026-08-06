"use client";
// 農民曆月曆 widget（/daily）：國曆月曆格 + 每格農曆 + 今天高亮 + 西元/民國年 + 今日農曆 + 月相。
// 農曆用瀏覽器內建 Intl chinese 曆（免外部依賴）；SSR 無穩定「現在」→ today 初始 null、掛載後才算。
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { moonPhase } from "@/lib/moon";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const LUNAR_DAYS = [
  "", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

/** 某天農曆：{ month:"七月", day:"十六", isFirst } —— isFirst=農曆初一（該格改顯示月名）。缺曆別回 null。 */
function lunarOf(date: Date): { month: string; day: string; isFirst: boolean } | null {
  try {
    const parts = new Intl.DateTimeFormat("zh-TW-u-ca-chinese", { month: "long", day: "numeric" }).formatToParts(date);
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const dayRaw = parts.find((p) => p.type === "day")?.value ?? "";
    const n = Number(dayRaw);
    const day = LUNAR_DAYS[n] ?? dayRaw;
    if (!month && !day) return null;
    return { month, day, isFirst: n === 1 };
  } catch {
    return null;
  }
}

export function CalendarWidget() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  if (!today) {
    return (
      <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4">
        <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1.5 mb-2"><CalendarDays className="w-4 h-4" /> 農民曆</div>
        <p className="text-sm text-black/50 dark:text-white/50">載入中…</p>
      </section>
    );
  }

  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based
  const todayDate = today.getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rocYear = year - 1911; // 民國年 = 西元 - 1911

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayLunar = lunarOf(today);
  const moon = moonPhase(today.getTime());

  return (
    <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4">
      <div className="flex items-end justify-between mb-2.5 gap-2 flex-wrap">
        <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> 農民曆</div>
        <div className="text-sm">
          <span className="font-bold text-black/85 dark:text-white/90">西元 {year} 年 {month + 1} 月</span>
          <span className="text-black/45 dark:text-white/45 ml-2">民國 {rocYear} 年</span>
        </div>
      </div>

      <div role="grid" aria-label={`西元 ${year} 年 ${month + 1} 月`} className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`text-[11px] font-semibold py-1 ${i === 0 || i === 6 ? "text-rose-500/80" : "text-black/45 dark:text-white/45"}`}>{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`blank-${i}`} />;
          const isToday = d === todayDate;
          const lu = lunarOf(new Date(year, month, d));
          const luLabel = lu ? (lu.isFirst ? lu.month : lu.day) : "";
          return (
            <div
              key={`d-${d}`}
              className={`rounded-lg py-1 leading-tight ${isToday ? "bg-indigo-500 text-white" : "text-black/80 dark:text-white/85"}`}
            >
              <div className="text-sm font-semibold tabular-nums">{d}</div>
              <div className={`text-[9px] ${isToday ? "text-white/85" : lu?.isFirst ? "text-indigo-500 dark:text-indigo-300 font-medium" : "text-black/40 dark:text-white/40"}`}>{luLabel}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-black/60 dark:text-white/60">
        <span>今日{todayLunar ? `農曆 ${todayLunar.month}${todayLunar.day}` : ""}</span>
        <span className="inline-flex items-center gap-1">{moon.emoji} {moon.name}</span>
      </div>
    </section>
  );
}
