"use client";
// 每日情報儀表板（Phase 1·固定版面）：核心=天氣/生活建議、AI 區=每日一句/單字/Tip、+月相、+運勢入口卡。
// 讀當下位置（瀏覽器定位、lat/lng 不儲存）。Phase 2 會做成 Space 那樣可自訂/拖拉的 widget（另立）。
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Umbrella, Droplets, Wind, Sunrise, Sunset, Sun, BookOpen, Lightbulb, Sparkles } from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";

const SAVED_CITY_KEY = "ai_island_weather_city";

interface W {
  place?: string; emoji: string; desc: string; tempMax: number; tempMin: number;
  feelsLike?: number; humidity?: number; windSpeed?: number; sunrise?: string; sunset?: string;
  precipProb: number; uvMax: number;
}
interface Props {
  word: { term: string; zh_name?: string; plain?: string; slug: string } | null;
  moon: { emoji: string; name: string; illum: number };
  sentence: string;
  tip: { q: string; body: string };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "夜深了";
  if (h < 11) return "早安";
  if (h < 14) return "午安";
  if (h < 18) return "午后好";
  return "晚安";
}

export function DailyDashboard({ word, moon, sentence, tip }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "denied" | "error">("idle");
  const [w, setW] = useState<W | null>(null);
  const [advice, setAdvice] = useState<string[]>([]);

  const apply = (d: { weather: W; advice?: string[] }) => { setW(d.weather); setAdvice(d.advice ?? []); setState("done"); };

  // 用選好的「區名」查天氣（geocode 反查座標），記住選擇下次直接套用
  const loadCity = async (district: string) => {
    setState("loading");
    try {
      const r = await fetch(`/api/weather?city=${encodeURIComponent(district)}`);
      if (!r.ok) { setState("error"); return; }
      apply(await r.json());
      try { localStorage.setItem(SAVED_CITY_KEY, district); } catch {}
    } catch { setState("error"); }
  };

  const load = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setState("error"); return; }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(`/api/weather?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          if (!r.ok) { setState("error"); return; }
          apply(await r.json());
        } catch { setState("error"); }
      },
      () => setState("denied"),
      { maximumAge: 5 * 60 * 1000, timeout: 8000, enableHighAccuracy: false },
    );
  };
  // 進頁：上次選過地區 → 直接套用；否則自動嘗試定位（拒絕/失敗有下拉 fallback）
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(SAVED_CITY_KEY); } catch {}
    if (saved) loadCity(saved); else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">🌅 每日情報 <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">Beta</span></h1>
        <span className="text-sm text-black/50 dark:text-white/50">{greeting()}，來學一點 AI ✨</span>
      </div>

      {/* ── 核心：天氣 hero ── */}
      {state === "done" && w ? (
        <section className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-400/15 via-sky-300/10 to-amber-300/10 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="text-6xl leading-none">{w.emoji}</div>
            <div className="min-w-0">
              <div className="text-sm text-black/60 dark:text-white/60 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {w.place ?? "你的位置"}</div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-sky-700 dark:text-sky-300">{w.tempMax}°</span>
                {w.feelsLike != null && <span className="text-sm text-black/50 dark:text-white/50 mb-1.5">體感 {w.feelsLike}°</span>}
              </div>
              <div className="text-sm text-black/70 dark:text-white/70">{w.desc}</div>
            </div>
          </div>
          {/* 明細列 */}
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            <Detail icon={<Umbrella className="w-4 h-4" />} label="降雨" value={`${w.precipProb}%`} />
            {w.humidity != null && <Detail icon={<Droplets className="w-4 h-4" />} label="濕度" value={`${w.humidity}%`} />}
            {w.windSpeed != null && <Detail icon={<Wind className="w-4 h-4" />} label="風速" value={`${w.windSpeed}km/h`} />}
            {w.sunrise && <Detail icon={<Sunrise className="w-4 h-4" />} label="日出" value={w.sunrise} />}
            {w.sunset && <Detail icon={<Sunset className="w-4 h-4" />} label="日落" value={w.sunset} />}
            <Detail icon={<Sun className="w-4 h-4" />} label="紫外線" value={String(w.uvMax)} warn={w.uvMax >= 8} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={load} className="text-xs text-black/40 dark:text-white/40 hover:text-sky-500">重新整理</button>
            <LocationPicker onPick={loadCity} compact />
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-5 sm:p-6">
          {state === "loading" ? (
            <p className="text-sm text-black/60 dark:text-white/60 inline-flex items-center gap-2 justify-center w-full"><Loader2 className="w-4 h-4 animate-spin" /> 讀取天氣中…</p>
          ) : state === "denied" || state === "error" ? (
            <div className="space-y-2.5">
              <p className="text-sm text-black/60 dark:text-white/60 text-center">
                {state === "denied" ? "沒拿到定位權限。" : "定位失敗或暫時查不到。"}直接選你的縣市／區看天氣（其他情報照常顯示）。
              </p>
              <div className="flex justify-center"><LocationPicker onPick={loadCity} /></div>
              <button onClick={load} className="block mx-auto text-xs text-sky-600 dark:text-sky-400 underline">或再試一次定位</button>
            </div>
          ) : (
            <div className="text-center space-y-2.5">
              <button onClick={load} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 text-sm font-medium"><MapPin className="w-4 h-4" /> 看我這裡的天氣</button>
              <div className="text-xs text-black/40 dark:text-white/40">或不想給定位 → 直接選地區：</div>
              <div className="flex justify-center"><LocationPicker onPick={loadCity} compact /></div>
            </div>
          )}
        </section>
      )}

      {/* ── 核心：AI 生活建議 ── */}
      {advice.length > 0 && (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">🌿 AI 生活建議</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {advice.slice(0, 6).map((t, i) => (
              <div key={i} className="text-sm text-black/70 dark:text-white/70 flex gap-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2"><span className="text-emerald-500">·</span><span>{t}</span></div>
            ))}
          </div>
        </section>
      )}

      {/* ── AI 區 + 月相 + 運勢：widget grid ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Widget title="AI 每日一句" icon={<Sparkles className="w-4 h-4" />} accent="violet">
          <p className="text-sm text-black/60 dark:text-white/60">今天適合：</p>
          <p className="text-lg font-bold mt-1 text-black/85 dark:text-white/90">「{sentence}」</p>
        </Widget>

        {word && (
          <Widget title="今日 AI 單字" icon={<BookOpen className="w-4 h-4" />} accent="sky" href={`/dictionary/${word.slug}`}>
            <p className="text-xl font-bold text-black/85 dark:text-white/90">{word.term}</p>
            {word.zh_name && <p className="text-sm text-black/60 dark:text-white/60">{word.zh_name}</p>}
            {word.plain && <p className="text-sm text-black/70 dark:text-white/70 mt-1 line-clamp-2">{word.plain}</p>}
          </Widget>
        )}

        <Widget title="今日 AI Tip" icon={<Lightbulb className="w-4 h-4" />} accent="amber">
          <p className="text-sm font-medium text-black/80 dark:text-white/85">{tip.q}</p>
          <p className="text-sm text-black/65 dark:text-white/65 mt-1">{tip.body}</p>
        </Widget>

        <Widget title="今日運勢" icon={<span className="text-base">🔮</span>} accent="fuchsia" href="/fortune">
          <p className="text-sm text-black/70 dark:text-white/70">星座運勢・塔羅・八字・易經</p>
          <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400 mt-1">點開看今天的你 →</p>
        </Widget>

        <Widget title="月相" icon={<span className="text-base">{moon.emoji}</span>} accent="indigo">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{moon.emoji}</span>
            <div><p className="text-lg font-bold text-black/85 dark:text-white/90">{moon.name}</p><p className="text-xs text-black/50 dark:text-white/50">照亮 {moon.illum}%</p></div>
          </div>
        </Widget>

        <Widget title="每天來學一點" icon={<span className="text-base">📚</span>} accent="emerald" href="/chapters">
          <p className="text-sm text-black/70 dark:text-white/70">開一課、跑一次沙盒，比收藏教學有用。</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">去上課 →</p>
        </Widget>
      </div>

      {/* 待辦清單 widget（localStorage、免登入） */}
      <TodoWidget />

      <p className="text-center text-sm text-black/50 dark:text-white/50 pt-2">
        {greeting()}！今天很適合來 AI 島學一點，讓自己變更強 🌤️
      </p>
      <p className="text-center text-[11px] text-black/35 dark:text-white/35">
        位置只用來查這次天氣、不會儲存 · 更多 widget（連勝／AI Dot／新聞…）與自訂排列即將推出
      </p>
    </main>
  );
}

// 今日待辦 widget：純 localStorage、免登入、每天自然清空（依日期 key）。
interface Todo { id: string; text: string; done: boolean }
function TodoWidget() {
  const todayKey = `ai-island-todo-${new Date().toISOString().slice(0, 10)}`;
  const [items, setItems] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  useEffect(() => {
    try { const raw = localStorage.getItem(todayKey); if (raw) setItems(JSON.parse(raw)); } catch { /* ignore */ }
  }, [todayKey]);
  const save = (next: Todo[]) => { setItems(next); try { localStorage.setItem(todayKey, JSON.stringify(next)); } catch { /* ignore */ } };
  const add = () => { const t = input.trim(); if (!t) return; save([...items, { id: `${Date.now()}`, text: t, done: false }]); setInput(""); };
  const toggle = (id: string) => save(items.map((it) => it.id === id ? { ...it, done: !it.done } : it));
  const remove = (id: string) => save(items.filter((it) => it.id !== id));
  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5">📝 今日待辦</div>
        {items.length > 0 && <span className="text-xs text-black/45 dark:text-white/45">{doneCount}/{items.length}</span>}
      </div>
      <div className="flex gap-2 mb-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="加一件今天想做的事…" className="flex-1 min-w-0 rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-rose-400" />
        <button onClick={add} className="shrink-0 rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 text-sm">加入</button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-black/40 dark:text-white/40 py-1">還沒有待辦。寫一件今天想完成的小事（每天自動換新）。</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 group">
              <button onClick={() => toggle(it.id)} className={`shrink-0 w-4 h-4 rounded border grid place-items-center ${it.done ? "bg-rose-500 border-rose-500 text-white" : "border-black/20 dark:border-white/25"}`}>
                {it.done && <span className="text-[10px] leading-none">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${it.done ? "line-through text-black/40 dark:text-white/40" : "text-black/80 dark:text-white/85"}`}>{it.text}</span>
              <button onClick={() => remove(it.id)} className="shrink-0 text-black/25 dark:text-white/25 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition text-xs">✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Detail({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-white/40 dark:bg-white/5 py-2">
      <div className={`grid place-items-center ${warn ? "text-rose-500" : "text-sky-600 dark:text-sky-400"}`}>{icon}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
      <div className="text-[10px] text-black/50 dark:text-white/50">{label}</div>
    </div>
  );
}

const ACCENT: Record<string, string> = {
  violet: "border-violet-500/20 bg-violet-500/[0.04]",
  sky: "border-sky-500/20 bg-sky-500/[0.04]",
  amber: "border-amber-500/20 bg-amber-500/[0.04]",
  fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/[0.04]",
  indigo: "border-indigo-500/20 bg-indigo-500/[0.04]",
  emerald: "border-emerald-500/20 bg-emerald-500/[0.04]",
};
function Widget({ title, icon, accent, href, children }: { title: string; icon: React.ReactNode; accent: string; href?: string; children: React.ReactNode }) {
  const inner = (
    <div className={`rounded-2xl border p-4 h-full ${ACCENT[accent] ?? ACCENT.violet} ${href ? "hover:shadow-sm transition" : ""}`}>
      <div className="text-xs font-semibold text-black/55 dark:text-white/55 inline-flex items-center gap-1.5 mb-2">{icon} {title}</div>
      {children}
    </div>
  );
  return href ? <Link href={href as any} className="block">{inner}</Link> : inner;
}
