"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles, Heart, Briefcase, Coins, Loader2, Star, Palette, Hash,
  Share2, Check, Cake, RefreshCw, ChevronDown, History, Clock,
  Link2, Download, X,
} from "lucide-react";
import { FeatureGuide } from "@/components/FeatureGuide";
import { ZODIAC_ZH, ZODIAC_EMOJI, type Zodiac } from "@/lib/fortune";
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
  const t = useTranslations("fortune");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TodayResp | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

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
        <p>{t("daily.loading")}</p>
      </div>
    );
  }

  // 未登入訪客：給免註冊的今日基本運勢試玩（塔羅/八字/梅花引導註冊）
  if ((data as any)?.error === "unauthorized") {
    return <GuestFortune />;
  }

  if (data?.needProfile) {
    return <BirthForm onSaved={load} />;
  }

  const f = data?.fortune;
  if (!f) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-black/60 dark:text-white/60">
        <p>{t("daily.unavailable")}</p>
        <button onClick={load} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 hover:bg-violet-500/25">
          <RefreshCw className="w-4 h-4" /> {t("daily.refresh")}
        </button>
      </div>
    );
  }

  const shareText = [
    t("daily.shareTitle", { emoji: data?.zodiacEmoji ?? "✨", zodiac: data?.zodiacZh ?? "", date: data?.date ?? "" }),
    t("daily.shareOverall", { overall: f.overall }),
    t("daily.shareLucky", { color: f.luckyColor, number: f.luckyNumber }),
    `💡 ${f.tip}`,
    t("daily.shareFrom"),
  ].join("\n");

  // 分享卡參數（OG 圖 + 落地頁共用）
  const sp = new URLSearchParams();
  sp.set("z", data?.zodiacZh ?? "");
  sp.set("e", data?.zodiacEmoji ?? "✨");
  if (typeof f.score === "number") sp.set("s", String(f.score));
  sp.set("o", f.overall);
  sp.set("c", f.luckyColor);
  sp.set("n", String(f.luckyNumber));
  sp.set("d", data?.date ?? "");
  const ogUrl = `/api/og/fortune?${sp.toString()}`;
  const sharePath = `/fortune/share?${sp.toString()}`;

  const aspects = [
    { key: "love", label: t("daily.love"), icon: Heart, text: f.love, cls: "text-rose-500" },
    { key: "career", label: t("daily.career"), icon: Briefcase, text: f.career, cls: "text-sky-500" },
    { key: "wealth", label: t("daily.wealth"), icon: Coins, text: f.wealth, cls: "text-amber-500" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      <FeatureGuide
        id="fortune"
        title="每日運勢・命理 使用說明"
        intro="結合星座每日運勢、塔羅、八字、易經的每日心靈小工具——放輕鬆看、當每天的正向提醒就好。"
        steps={[
          { title: "填一次生日資料", desc: "生日（可選時辰、國曆／農曆）填一次即可，用來算你的星座與命盤；沒有時辰也能算（精度會標示較低）。" },
          { title: "看每日運勢", desc: "整體 / 愛情 / 事業 / 財運四面向 + 分數 + 幸運色數字 + 一句提醒，每天更新一次。" },
          { title: "抽塔羅 / 排八字 / 卜易經", desc: "塔羅可帶問題抽三張牌陣；八字排正統四柱五行；易經梅花易數起卦。想要 AI 深入解讀就展開對應區塊。" },
          { title: "分享運勢卡", desc: "按分享會產生一張運勢 OG 圖卡，可分享到其他 App、複製連結或下載圖片。" },
          { title: "綁 LINE 每日推播", desc: "到設定開啟 LINE 通知，每天早上自動把當日運勢推到你的 LINE。" },
        ]}
        tip="運勢命理僅供娛樂與正向參考，不做醫療 / 投資 / 法律等具體斷言。免費每日基本盤；塔羅、易經 AI 深解免費每日 1 次、付費無限。"
      />

      {/* 星座 + 日期 + 分數環 */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/15 dark:to-fuchsia-500/15 border border-violet-500/20 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="text-5xl sm:text-6xl leading-none">{data?.zodiacEmoji}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-black/85 dark:text-white/90">
              {t("daily.title", { zodiac: data?.zodiacZh ?? "" })}
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
            <div className="flex items-center gap-1 text-xs text-black/45 dark:text-white/45"><Palette className="w-3.5 h-3.5" /> {t("daily.luckyColor")}</div>
            <div className="text-base font-semibold text-black/80 dark:text-white/85">{f.luckyColor}</div>
          </div>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 grid place-items-center font-bold shrink-0">{f.luckyNumber}</span>
          <div>
            <div className="flex items-center gap-1 text-xs text-black/45 dark:text-white/45"><Hash className="w-3.5 h-3.5" /> {t("daily.luckyNumber")}</div>
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
        <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 transition">
          <Share2 className="w-4 h-4" /> {t("daily.share")}
        </button>
        <a href="/settings" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm">
          <Star className="w-4 h-4" /> {t("daily.enableLinePush")}
        </a>
      </div>
      <p className="text-center text-xs text-black/35 dark:text-white/35 pt-2">
        {t("daily.disclaimer")}
      </p>

      {shareOpen && (
        <ShareSheet ogUrl={ogUrl} sharePath={sharePath} shareText={shareText} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

/** 分享面板：OG 圖卡預覽 + 分享到其他 App（Web Share）+ 複製連結 + 下載圖卡。 */
function ShareSheet({ ogUrl, sharePath, shareText, onClose }: { ogUrl: string; sharePath: string; shareText: string; onClose: () => void }) {
  const t = useTranslations("fortune");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const shareUrl = (typeof window !== "undefined" ? window.location.origin : "") + sharePath;

  const nativeShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 先試「連圖片一起分享」（手機分享面板會帶圖卡），不支援就退回分享連結
      const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean };
      try {
        const blob = await fetch(ogUrl).then((r) => (r.ok ? r.blob() : null));
        if (blob) {
          const file = new File([blob], "fortune.png", { type: blob.type || "image/png" });
          if (nav.canShare && nav.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text: shareText, url: shareUrl });
            return;
          }
        }
      } catch { /* 圖片分享失敗 → 退回連結分享 */ }
      if (navigator.share) {
        await navigator.share({ text: shareText, url: shareUrl });
        return;
      }
      await copyLink();
    } catch { /* 使用者取消 */ } finally { setBusy(false); }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard 不可用 */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-black/85 dark:text-white/90">{t("share.title")}</h3>
          <button onClick={onClose} aria-label={t("share.close")} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/50 dark:text-white/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OG 圖卡預覽（跟分享出去/落地頁看到的一致） */}
        <div className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ogUrl} alt={t("share.previewAlt")} width={1200} height={630} className="w-full h-auto block" loading="lazy" />
        </div>

        <button onClick={nativeShare} disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-60 transition">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} {t("share.shareTo")}
        </button>

        {/* 連結 + 複製 */}
        <div className="flex items-center gap-2 rounded-full border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/5 pl-3 pr-1 py-1">
          <Link2 className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-xs text-black/55 dark:text-white/55">{shareUrl}</span>
          <button onClick={copyLink}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 text-xs font-medium hover:bg-violet-500/25 transition">
            {copied ? <><Check className="w-3.5 h-3.5" /> {t("share.linkCopied")}</> : <><Link2 className="w-3.5 h-3.5" /> {t("share.copyLink")}</>}
          </button>
        </div>

        <a href={ogUrl} download="fortune.png"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm">
          <Download className="w-4 h-4" /> {t("share.download")}
        </a>

        <p className="text-center text-[11px] text-black/35 dark:text-white/35">{t("share.note")}</p>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const t = useTranslations("fortune");
  const r = 22, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="relative w-16 h-16 shrink-0" title={t("daily.scoreTitle", { score })}>
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
const SHICHEN: Array<{ key: string; value: string }> = [
  { key: "zi", value: "23:00" },
  { key: "chou", value: "01:00" },
  { key: "yin", value: "03:00" },
  { key: "mao", value: "05:00" },
  { key: "chen", value: "07:00" },
  { key: "si", value: "09:00" },
  { key: "wu", value: "11:00" },
  { key: "wei", value: "13:00" },
  { key: "shen", value: "15:00" },
  { key: "you", value: "17:00" },
  { key: "xu", value: "19:00" },
  { key: "hai", value: "21:00" },
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
  const t = useTranslations("fortune");
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
    if (!year || !month || !day) { setErr(t("form.errIncomplete")); return; }
    const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/fortune/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, birthTime: birthTime || undefined, gender: gender || undefined, calendarType }),
      });
      if (!r.ok) { setErr(t("form.errSave")); setSaving(false); return; }
      onSaved();
    } catch {
      setErr(t("form.errSave")); setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🔮</div>
        <h1 className="text-2xl font-bold text-black/85 dark:text-white/90">{t("form.title")}</h1>
        <p className="text-sm text-black/55 dark:text-white/55 mt-1">{t("form.subtitle")}</p>
      </div>
      <div className="space-y-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-5 sm:p-6">
        {/* 生日：年 / 月 / 日 下拉（不用日曆、選生日更順手） */}
        <div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-black/70 dark:text-white/70 mb-1.5"><Cake className="w-4 h-4 text-violet-500" /> {t("form.birthday")} <span className="text-rose-500">*</span></span>
          <div className="grid grid-cols-3 gap-2">
            <Select value={year} onChange={setYear}>
              <option value="">{t("form.year")}</option>
              {Array.from({ length: 100 }, (_, i) => nowYear - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
            <Select value={month} onChange={(v) => { setMonth(v); if (day && Number(day) > new Date(Number(year) || 2000, Number(v), 0).getDate()) setDay(""); }}>
              <option value="">{t("form.month")}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{t("form.monthOption", { m })}</option>
              ))}
            </Select>
            <Select value={day} onChange={setDay}>
              <option value="">{t("form.day")}</option>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dd) => (
                <option key={dd} value={dd}>{t("form.dayOption", { d: dd })}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* 出生時辰：十二時辰下拉（八字用、選填） */}
        <div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-black/70 dark:text-white/70 mb-1.5"><Clock className="w-4 h-4 text-violet-500" /> {t("form.birthTime")} <span className="text-xs font-normal text-black/40 dark:text-white/40">{t("form.birthTimeHint")}</span></span>
          <Select value={birthTime} onChange={setBirthTime}>
            <option value="">{t("form.birthTimeNone")}</option>
            {SHICHEN.map((s) => <option key={s.value} value={s.value}>{t(`form.shichen.${s.key}`)}</option>)}
          </Select>
        </div>

        <div>
          <span className="text-sm font-medium text-black/70 dark:text-white/70 mb-1.5 block">{t("form.calendar")}</span>
          <div className="flex gap-2">
            {([["solar", t("form.solar")], ["lunar", t("form.lunar")]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setCalendarType(v)} type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm border transition ${calendarType === v ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-violet-400/60"}`}>{l}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-black/70 dark:text-white/70 mb-1.5 block">{t("form.gender")} <span className="text-xs font-normal text-black/40 dark:text-white/40">{t("form.genderHint")}</span></span>
          <div className="flex gap-2">
            {([["male", t("form.male")], ["female", t("form.female")], ["other", t("form.other")]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setGender(gender === v ? "" : v)} type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm border transition ${gender === v ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-violet-400/60"}`}>{l}</button>
            ))}
          </div>
        </div>

        {err && <p className="text-sm text-rose-500 text-center">{err}</p>}
        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-sm">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("form.casting")}</> : <><Sparkles className="w-4 h-4" /> {t("form.submit")}</>}
        </button>
        <p className="text-xs text-black/40 dark:text-white/40 text-center leading-relaxed">{t("form.footer")}</p>
      </div>
    </div>
  );
}

// ── 未登入訪客：免註冊今日基本運勢（零 AI・娛樂），塔羅/八字/梅花引導註冊 ──
function GuestFortune() {
  const t = useTranslations("fortune");
  const [zodiac, setZodiac] = useState<Zodiac | null>(null);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<FortunePayload | null>(null);

  const pick = useCallback(async (z: Zodiac) => {
    setZodiac(z); setLoading(true); setF(null);
    try {
      const r = await fetch(`/api/fortune/public?zodiac=${z}`);
      const d = await r.json();
      setF(d.fortune ?? null);
    } catch { setF(null); } finally { setLoading(false); }
  }, []);

  const ZS = Object.keys(ZODIAC_ZH) as Zodiac[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-5">
        <h1 className="text-xl font-bold text-black/85 dark:text-white/90">{t("guest.title")}</h1>
        <p className="text-sm text-black/50 dark:text-white/50 mt-1">{t("guest.subtitle")}</p>
      </div>

      {/* 星座選擇 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-5">
        {ZS.map((z) => (
          <button key={z} onClick={() => pick(z)}
            className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border text-sm transition ${zodiac === z ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "border-black/12 dark:border-white/12 text-black/65 dark:text-white/65 hover:border-violet-400/60"}`}>
            <span className="text-lg leading-none">{ZODIAC_EMOJI[z]}</span>
            <span className="text-xs">{ZODIAC_ZH[z]}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-black/50 dark:text-white/50 py-6"><Loader2 className="w-5 h-5 animate-spin" /> {t("daily.loading")}</div>
      )}

      {f && !loading && (
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 dark:from-violet-500/10 dark:to-fuchsia-500/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-black/80 dark:text-white/85">{zodiac && ZODIAC_EMOJI[zodiac]} {zodiac && ZODIAC_ZH[zodiac]}</span>
            {typeof f.score === "number" && <span className="text-2xl font-bold text-violet-500">{f.score}<span className="text-sm text-black/40 dark:text-white/40"> {t("guest.scoreUnit")}</span></span>}
          </div>
          <p className="text-black/75 dark:text-white/80 leading-relaxed">{f.overall}</p>
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/15 p-2.5"><div className="text-xs text-rose-500 font-semibold mb-0.5">💗 {t("daily.love")}</div><p className="text-black/70 dark:text-white/75 text-[13px] leading-relaxed">{f.love}</p></div>
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/15 p-2.5"><div className="text-xs text-sky-500 font-semibold mb-0.5">💼 {t("daily.career")}</div><p className="text-black/70 dark:text-white/75 text-[13px] leading-relaxed">{f.career}</p></div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/15 p-2.5"><div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-0.5">💰 {t("daily.wealth")}</div><p className="text-black/70 dark:text-white/75 text-[13px] leading-relaxed">{f.wealth}</p></div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/55 dark:text-white/55">
            <span>🎨 {t("daily.luckyColor")}：{f.luckyColor}</span>
            <span>🔢 {t("daily.luckyNumber")}：{f.luckyNumber}</span>
          </div>
          {f.tip && <p className="text-xs text-amber-600 dark:text-amber-400">💡 {f.tip}</p>}
        </div>
      )}

      {/* 註冊引導 */}
      <div className="mt-5 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4 text-center space-y-2.5">
        <p className="text-sm text-black/70 dark:text-white/75 leading-relaxed">{t("guest.upsell")}</p>
        <a href="/login?next=/fortune" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition">
          <Sparkles className="w-4 h-4" /> {t("guest.cta")}
        </a>
      </div>
      <p className="text-center text-[11px] text-black/35 dark:text-white/35 mt-3">{t("guest.disclaimer")}</p>
    </div>
  );
}
