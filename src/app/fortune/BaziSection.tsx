"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ScrollText, ChevronDown, Sparkles, Pencil } from "lucide-react";

// 12 時辰對照：讓「記得時辰、不記得幾點」的人也能選（值＝該時辰中點，避開邊界誤差）
const SHICHEN: Array<{ label: string; time: string }> = [
  { label: "子時 23–01", time: "00:00" }, { label: "丑時 01–03", time: "02:00" },
  { label: "寅時 03–05", time: "04:00" }, { label: "卯時 05–07", time: "06:00" },
  { label: "辰時 07–09", time: "08:00" }, { label: "巳時 09–11", time: "10:00" },
  { label: "午時 11–13", time: "12:00" }, { label: "未時 13–15", time: "14:00" },
  { label: "申時 15–17", time: "16:00" }, { label: "酉時 17–19", time: "18:00" },
  { label: "戌時 19–21", time: "20:00" }, { label: "亥時 21–23", time: "22:00" },
];

type Pillar = { ganzhi: string; gan: string; zhi: string; wuxing: string; nayin: string; shishen: string | null };
type Chart = {
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  dayMaster: string; dayMasterWuxing: string; shengXiao: string; xingZuo: string; lunarDate: string; hasHour: boolean;
};
type Reading = { overview: string; strengths: string; watch: string; advice: string };
type Resp = { needProfile?: boolean; chart?: Chart; reading?: Reading; error?: string };

// 五行配色
const WX_COLOR: Record<string, string> = {
  木: "text-emerald-500", 火: "text-rose-500", 土: "text-amber-600 dark:text-amber-400",
  金: "text-yellow-500", 水: "text-sky-500",
};
function wuxingColored(wx: string) {
  return wx.split("").map((c, i) => <span key={i} className={WX_COLOR[c] ?? ""}>{c}</span>);
}

const PILLAR_KEYS: Array<keyof Chart["pillars"]> = ["year", "month", "day", "hour"];

export function BaziSection() {
  const t = useTranslations("fortune");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resp | null>(null);

  // 自訂/幫別人算 表單
  const [showForm, setShowForm] = useState(false);
  const [fDate, setFDate] = useState("");
  const [fShichen, setFShichen] = useState("");      // "" = 不知道時辰
  const [fCalendar, setFCalendar] = useState<"solar" | "lunar">("solar");
  const [fGender, setFGender] = useState<"" | "male" | "female">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/fortune/bazi");
      setData(await r.json());
    } catch { setData({ error: "fetch_failed" }); } finally {
      setLoading(false); setLoaded(true);
    }
  }, []);

  const submitCustom = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fDate)) return;
    setLoading(true); setShowForm(false);
    try {
      const r = await fetch("/api/fortune/bazi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: fDate,
          birthTime: fShichen || null,
          calendarType: fCalendar,
          gender: fGender || null,
        }),
      });
      setData(await r.json());
    } catch { setData({ error: "fetch_failed" }); } finally {
      setLoading(false); setLoaded(true);
    }
  }, [fDate, fShichen, fCalendar, fGender]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) load();
  };

  const chart = data?.chart;
  const reading = data?.reading;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10 overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
        <span className="text-2xl shrink-0">🀄</span>
        <div className="flex-1 text-left">
          <div className="font-semibold text-black/80 dark:text-white/85">{t("bazi.title")}</div>
          <div className="text-xs text-black/50 dark:text-white/50">{t("bazi.subtitle")}</div>
        </div>
        <ChevronDown className={`w-5 h-5 text-black/35 dark:text-white/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4">
          {/* 改生日 / 幫別人算 */}
          <div className="mb-3">
            <button onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition">
              <Pencil className="w-3.5 h-3.5" /> {t("bazi.customToggle")}
            </button>
            {showForm && (
              <div className="mt-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3 space-y-2.5">
                <p className="text-[11px] text-black/50 dark:text-white/50">{t("bazi.customHint")}</p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1 text-xs text-black/55 dark:text-white/55">
                    {t("bazi.fieldDate")}
                    <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
                      className="rounded-lg border border-black/15 dark:border-white/15 bg-white/80 dark:bg-black/30 px-2 py-1.5 text-sm text-black/80 dark:text-white/85" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-black/55 dark:text-white/55">
                    {t("bazi.fieldShichen")}
                    <select value={fShichen} onChange={(e) => setFShichen(e.target.value)}
                      className="rounded-lg border border-black/15 dark:border-white/15 bg-white/80 dark:bg-black/30 px-2 py-1.5 text-sm text-black/80 dark:text-white/85">
                      <option value="">{t("bazi.shichenUnknown")}</option>
                      {SHICHEN.map((s) => <option key={s.time} value={s.time}>{s.label}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-black/55 dark:text-white/55">
                    {t("bazi.fieldCalendar")}
                    <select value={fCalendar} onChange={(e) => setFCalendar(e.target.value as "solar" | "lunar")}
                      className="rounded-lg border border-black/15 dark:border-white/15 bg-white/80 dark:bg-black/30 px-2 py-1.5 text-sm text-black/80 dark:text-white/85">
                      <option value="solar">{t("bazi.calSolar")}</option>
                      <option value="lunar">{t("bazi.calLunar")}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-black/55 dark:text-white/55">
                    {t("bazi.fieldGender")}
                    <select value={fGender} onChange={(e) => setFGender(e.target.value as "" | "male" | "female")}
                      className="rounded-lg border border-black/15 dark:border-white/15 bg-white/80 dark:bg-black/30 px-2 py-1.5 text-sm text-black/80 dark:text-white/85">
                      <option value="">{t("bazi.genderUnknown")}</option>
                      <option value="male">{t("bazi.genderMale")}</option>
                      <option value="female">{t("bazi.genderFemale")}</option>
                    </select>
                  </label>
                </div>
                <button onClick={submitCustom} disabled={!/^\d{4}-\d{2}-\d{2}$/.test(fDate)}
                  className="w-full rounded-lg bg-amber-500 text-black text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-40 transition">
                  {t("bazi.customSubmit")}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50 py-4"><Loader2 className="w-4 h-4 animate-spin" /> {t("bazi.calculating")}</div>
          ) : !chart ? (
            <p className="text-sm text-black/45 dark:text-white/45 py-4 text-center">{t("bazi.unavailable")}</p>
          ) : (
            <div className="space-y-4">
              {/* 命盤四柱 */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {PILLAR_KEYS.map((key) => {
                  const p = chart.pillars[key];
                  return (
                    <div key={key} className="rounded-xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 p-2">
                      <div className="text-[10px] text-black/40 dark:text-white/40 mb-1">{t(`bazi.pillar.${key}`)}</div>
                      {p ? (
                        <>
                          <div className="text-lg font-bold text-black/85 dark:text-white/90 tracking-wide">{p.ganzhi}</div>
                          <div className="text-[11px] mt-0.5">{wuxingColored(p.wuxing)}</div>
                          <div className="text-[10px] text-violet-500 mt-0.5">{p.shishen ?? t("bazi.dayMasterShort")}</div>
                          <div className="text-[9px] text-black/35 dark:text-white/35 mt-0.5">{p.nayin}</div>
                        </>
                      ) : (
                        <div className="text-[11px] text-black/30 dark:text-white/30 py-3">{t("bazi.noHour")}<br/>{t("bazi.omitted")}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 命盤摘要 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/55 dark:text-white/55 justify-center">
                <span>{t("bazi.dayMaster")} <b className={WX_COLOR[chart.dayMasterWuxing] ?? ""}>{t("bazi.dayMasterValue", { master: chart.dayMaster, wuxing: chart.dayMasterWuxing })}</b></span>
                <span>{t("bazi.shengXiao", { v: chart.shengXiao })}</span>
                <span>{t("bazi.xingZuo", { v: chart.xingZuo })}</span>
                <span>{chart.lunarDate}</span>
              </div>
              {!chart.hasHour && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">{t("bazi.noHourWarning")}</p>
              )}

              {/* AI 解讀 */}
              {reading && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-black/70 dark:text-white/70"><ScrollText className="w-4 h-4 text-amber-500" /> {t("bazi.readingTitle")}</div>
                  <p className="text-sm leading-relaxed text-black/75 dark:text-white/80">{reading.overview}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{t("bazi.strengths")}</div>
                      <p className="text-sm text-black/70 dark:text-white/75 leading-relaxed">{reading.strengths}</p>
                    </div>
                    <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3">
                      <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1">{t("bazi.watch")}</div>
                      <p className="text-sm text-black/70 dark:text-white/75 leading-relaxed">{reading.watch}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-black/75 dark:text-white/80 leading-relaxed">{reading.advice}</p>
                  </div>
                </div>
              )}
              <p className="text-center text-[11px] text-black/35 dark:text-white/35">{t("bazi.disclaimer")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
