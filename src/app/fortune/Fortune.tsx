"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles, Heart, Briefcase, Coins, Loader2, Star, Palette, Hash,
  Share2, Check, Cake, RefreshCw, ChevronDown, History, Clock,
} from "lucide-react";
import { TarotSection } from "./TarotSection";
import { BaziSection } from "./BaziSection";
import { IChingSection } from "./IChingSection";
import { HistorySection } from "./HistorySection";

type FortunePayload = {
  overall: string; love: string; career: string; wealth: string;
  luckyColor: string; luckyNumber: number; tip: string; score?: number;
};
type TodayResp = {
  needProfile?: boolean;
  fortune?: FortunePayload;
  zodiacZh?: string; zodiacEmoji?: string; date?: string;
  degraded?: boolean;
};

// 常見顏色名 → 色票（分享卡/色塊用；查不到給中性灰）
const COLOR_HEX: Record<string, string> = {
  紅: "#ef4444", 大紅: "#dc2626", 粉紅: "#f472b6", 橘: "#f97316", 橙: "#f97316",
  黃: "#eab308", 金: "#d4af37", 金色: "#d4af37", 綠: "#22c55e", 草綠: "#4ade80",
  藍: "#3b82f6", 天空藍: "#38bdf8", 天藍: "#38bdf8", 靛: "#6366f1", 紫: "#a855f7",
  白: "#f8fafc", 黑: "#1e293b", 灰: "#94a3b8", 咖啡: "#92400e", 棕: "#92400e",
  銀: "#cbd5e1", 銀色: "#cbd5e1",
};
function colorHex(name: string): string {
  for (const key of Object.keys(COLOR_HEX)) if (name.includes(key)) return COLOR_HEX[key];
  return "#94a3b8";
}

export function Fortune() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TodayResp | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/fortune/today");
      setData(await r.json());
    } catch {
      setData({ needProfile: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-3 text-black/50 dark:text-white/50">
        <Loader2 className="w-7 h-7 animate-spin" />
        <p>正在為你占卜今天的運勢…</p>
      </div>
    );
  }

  if (data?.needProfile) {
    return <BirthForm onSaved={load} />;
  }

  const f = data?.fortune;
  if (!f) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-black/60 dark:text-white/60">
        <p>運勢暫時拿不到，稍後再試一次。</p>
        <button onClick={load} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 hover:bg-violet-500/25">
          <RefreshCw className="w-4 h-4" /> 重新整理
        </button>
      </div>
    );
  }

  const shareText = [
    `${data?.zodiacEmoji ?? "✨"} ${data?.zodiacZh ?? ""} ${data?.date ?? ""} 今日運勢`,
    `整體：${f.overall}`,
    `幸運色 ${f.luckyColor}｜幸運數字 ${f.luckyNumber}`,
    `💡 ${f.tip}`,
    "— 來自 AI 島每日運勢 ai-island-web.snowrealm.pet",
  ].join("\n");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* 使用者取消分享 */ }
  };

  const aspects = [
    { key: "love", label: "愛情", icon: Heart, text: f.love, cls: "text-rose-500" },
    { key: "career", label: "事業", icon: Briefcase, text: f.career, cls: "text-sky-500" },
    { key: "wealth", label: "財運", icon: Coins, text: f.wealth, cls: "text-amber-500" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      {/* 星座 + 日期 + 分數環 */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/15 dark:to-fuchsia-500/15 border border-violet-500/20 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="text-5xl sm:text-6xl leading-none">{data?.zodiacEmoji}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-black/85 dark:text-white/90">
              {data?.zodiacZh} · 今日運勢
            </h1>
            <p className="text-sm text-black/50 dark:text-white/50">{data?.date}</p>
          </div>
          {typeof f.score === "number" && <ScoreRing score={f.score} />}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-black/75 dark:text-white/80">{f.overall}</p>
      </div>

      {/* 三面向 */}
      <div className="grid gap-3 sm:grid-cols-3">
        {aspects.map((a) => (
          <div key={a.key} className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4">
            <div className={`flex items-center gap-2 text-sm font-semibold ${a.cls}`}>
              <a.icon className="w-4 h-4" /> {a.label}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-black/70 dark:text-white/70">{a.text}</p>
          </div>
        ))}
      </div>

      {/* 幸運色 / 幸運數字 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full border border-black/10 dark:border-white/20 shrink-0" style={{ background: colorHex(f.luckyColor) }} />
          <div>
            <div className="flex items-center gap-1 text-xs text-black/45 dark:text-white/45"><Palette className="w-3.5 h-3.5" /> 幸運色</div>
            <div className="text-base font-semibold text-black/80 dark:text-white/85">{f.luckyColor}</div>
          </div>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 grid place-items-center font-bold shrink-0">{f.luckyNumber}</span>
          <div>
            <div className="flex items-center gap-1 text-xs text-black/45 dark:text-white/45"><Hash className="w-3.5 h-3.5" /> 幸運數字</div>
            <div className="text-base font-semibold text-black/80 dark:text-white/85">{f.luckyNumber}</div>
          </div>
        </div>
      </div>

      {/* 今日提醒 */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-4 flex gap-3">
        <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed text-black/75 dark:text-white/80">{f.tip}</p>
      </div>

      {/* 塔羅占卜 */}
      <TarotSection />

      {/* 八字命盤 */}
      <BaziSection />

      {/* 易經 · 梅花易數 */}
      <IChingSection />

      {/* 歷史運勢 */}
      <HistorySection />

      {/* 動作列 */}
      <div className="flex flex-wrap gap-3 pt-1">
        <button onClick={share} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 transition">
          {copied ? <><Check className="w-4 h-4" /> 已複製</> : <><Share2 className="w-4 h-4" /> 分享今日運勢</>}
        </button>
        <a href="/settings" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm">
          <Star className="w-4 h-4" /> 開啟每日 LINE 推播
        </a>
      </div>
      <p className="text-center text-xs text-black/35 dark:text-white/35 pt-2">
        運勢僅供娛樂參考、正向陪你過每一天，不作醫療 / 投資 / 法律建議。
      </p>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="relative w-16 h-16 shrink-0" title={`今日綜合分 ${score}`}>
      <svg viewBox="0 0 56 56" className="w-16 h-16 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-black/10 dark:stroke-white/10" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" strokeLinecap="round"
          className="stroke-violet-500" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold text-black/75 dark:text-white/85">{score}</span>
    </div>
  );
}

// 十二時辰 → 代表時間（HH:MM），給八字用；「不知道」= 空
const SHICHEN: Array<{ label: string; value: string }> = [
  { label: "子時（23–01）", value: "23:00" },
  { label: "丑時（01–03）", value: "01:00" },
  { label: "寅時（03–05）", value: "03:00" },
  { label: "卯時（05–07）", value: "05:00" },
  { label: "辰時（07–09）", value: "07:00" },
  { label: "巳時（09–11）", value: "09:00" },
  { label: "午時（11–13）", value: "11:00" },
  { label: "未時（13–15）", value: "13:00" },
  { label: "申時（15–17）", value: "15:00" },
  { label: "酉時（17–19）", value: "17:00" },
  { label: "戌時（19–21）", value: "19:00" },
  { label: "亥時（21–23）", value: "21:00" },
];

/** 好看的原生 select（帶 chevron、亮暗、RWD）。 */
function Select({ value, onChange, children, className = "" }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2.5 pr-9 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 text-black/80 dark:text-white/85 text-sm cursor-pointer hover:border-violet-400/60 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition">
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-black/35 dark:text-white/35 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function BirthForm({ onSaved }: { onSaved: () => void }) {
  const nowYear = new Date().getFullYear();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // 依年月算當月天數（含閏年），日下拉只顯示有效日
  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;

  const save = async () => {
    if (!year || !month || !day) { setErr("請完整選擇生日的年、月、日"); return; }
    const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/fortune/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, birthTime: birthTime || undefined, gender: gender || undefined, calendarType }),
      });
      if (!r.ok) { setErr("儲存失敗，再試一次"); setSaving(false); return; }
      onSaved();
    } catch {
      setErr("儲存失敗，再試一次"); setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🔮</div>
        <h1 className="text-2xl font-bold text-black/85 dark:text-white/90">每日運勢</h1>
        <p className="text-sm text-black/55 dark:text-white/55 mt-1">填一次生日，之後每天為你占卜今日運勢</p>
      </div>
      <div className="space-y-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-5 sm:p-6">
        {/* 生日：年 / 月 / 日 下拉（不用日曆、選生日更順手） */}
        <div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-black/70 dark:text-white/70 mb-1.5"><Cake className="w-4 h-4 text-violet-500" /> 生日 <span className="text-rose-500">*</span></span>
          <div className="grid grid-cols-3 gap-2">
            <Select value={year} onChange={setYear}>
              <option value="">年</option>
              {Array.from({ length: 100 }, (_, i) => nowYear - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
            <Select value={month} onChange={(v) => { setMonth(v); if (day && Number(day) > new Date(Number(year) || 2000, Number(v), 0).getDate()) setDay(""); }}>
              <option value="">月</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m} 月</option>
              ))}
            </Select>
            <Select value={day} onChange={setDay}>
              <option value="">日</option>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dd) => (
                <option key={dd} value={dd}>{dd} 日</option>
              ))}
            </Select>
          </div>
        </div>

        {/* 出生時辰：十二時辰下拉（八字用、選填） */}
        <div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-black/70 dark:text-white/70 mb-1.5"><Clock className="w-4 h-4 text-violet-500" /> 出生時辰 <span className="text-xs font-normal text-black/40 dark:text-white/40">選填・八字用</span></span>
          <Select value={birthTime} onChange={setBirthTime}>
            <option value="">不知道 / 不填</option>
            {SHICHEN.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>

        <div>
          <span className="text-sm font-medium text-black/70 dark:text-white/70 mb-1.5 block">曆別</span>
          <div className="flex gap-2">
            {([["solar", "國曆"], ["lunar", "農曆"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setCalendarType(v)} type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm border transition ${calendarType === v ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-violet-400/60"}`}>{l}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-black/70 dark:text-white/70 mb-1.5 block">性別 <span className="text-xs font-normal text-black/40 dark:text-white/40">選填</span></span>
          <div className="flex gap-2">
            {([["male", "男"], ["female", "女"], ["other", "其他"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setGender(gender === v ? "" : v)} type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm border transition ${gender === v ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-violet-400/60"}`}>{l}</button>
            ))}
          </div>
        </div>

        {err && <p className="text-sm text-rose-500 text-center">{err}</p>}
        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-sm">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> 占卜中…</> : <><Sparkles className="w-4 h-4" /> 看今天的運勢</>}
        </button>
        <p className="text-xs text-black/40 dark:text-white/40 text-center leading-relaxed">填了生日就有西洋星座每日運勢；再填時辰，八字命盤更完整。</p>
      </div>
    </div>
  );
}
