import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase-server";
import { QUEST_LEVELS } from "@/lib/quest/levels";
import { PAINT_LEVELS } from "@/lib/quest/paint-levels";
import { TURTLE_LEVELS } from "@/lib/quest/turtle-levels";
import { NUMBER_LEVELS } from "@/lib/quest/number-levels";
import { DEBUG_LEVELS } from "@/lib/quest/debug-levels";
import { SORT_LEVELS } from "@/lib/quest/sort-levels";
import { CSS_LEVELS } from "@/lib/quest/css-levels";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "程式副本島 — 玩遊戲學寫程式 | AI 島",
  description: "寫 Python 控制機器人、畫圖、畫幾何、解謎、抓蟲，邊玩邊學。每關對應一個程式觀念。",
  alternates: { canonical: "/quest" },
};

type Lv = { id: string; title: string; concept: string; xp: number; z: number };
const SECTIONS: { key: string; emoji: string; label: string; desc: string; base: string; levels: Lv[]; grad: string; ring: string }[] = [
  { key: "maze", emoji: "🤖", label: "迷宮機器人", desc: "move / for / if / while", base: "/quest", levels: QUEST_LEVELS, grad: "from-emerald-500/20 to-teal-500/10", ring: "border-emerald-400/40" },
  { key: "paint", emoji: "🎨", label: "畫圖機器人", desc: "paint() 上色拼圖案", base: "/quest/paint", levels: PAINT_LEVELS, grad: "from-fuchsia-500/20 to-pink-500/10", ring: "border-fuchsia-400/40" },
  { key: "turtle", emoji: "🐢", label: "Turtle 幾何", desc: "forward / right 畫形狀", base: "/quest/turtle", levels: TURTLE_LEVELS, grad: "from-lime-500/20 to-green-500/10", ring: "border-lime-400/40" },
  { key: "number", emoji: "🔢", label: "數字關卡", desc: "變數 + 運算解謎", base: "/quest/number", levels: NUMBER_LEVELS, grad: "from-sky-500/20 to-blue-500/10", ring: "border-sky-400/40" },
  { key: "debug", emoji: "🐛", label: "抓蟲關", desc: "改對壞掉的 code", base: "/quest/debug", levels: DEBUG_LEVELS, grad: "from-amber-500/20 to-orange-500/10", ring: "border-amber-400/40" },
  { key: "sort", emoji: "📊", label: "排序視覺化", desc: "寫排序 · 看長條歸位", base: "/quest/sort", levels: SORT_LEVELS, grad: "from-cyan-500/20 to-blue-500/10", ring: "border-cyan-400/40" },
  { key: "css", emoji: "🎯", label: "前端 CSS 關", desc: "寫 CSS 把方塊擺到定位", base: "/quest/css", levels: CSS_LEVELS, grad: "from-violet-500/20 to-purple-500/10", ring: "border-violet-400/40" },
];

export default async function QuestPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const doneMap: Record<string, number> = {};
  if (user) {
    const { data } = await supabase.from("quest_completions").select("level_id, stars").eq("user_id", user.id);
    for (const r of (data ?? []) as any[]) doneMap[r.level_id] = r.stars;
  }
  const totalLevels = SECTIONS.reduce((s, sec) => s + sec.levels.length, 0);
  const totalDone = SECTIONS.reduce((s, sec) => s + sec.levels.filter((l) => doneMap[l.id]).length, 0);
  const totalStars = SECTIONS.reduce((s, sec) => s + sec.levels.reduce((a, l) => a + (doneMap[l.id] ?? 0), 0), 0);
  const pct = Math.round((totalDone / totalLevels) * 100);

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      {/* 街機背景 */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0a1226] via-[#0b1020] to-black" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" style={{ backgroundImage: "linear-gradient(rgba(80,250,123,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(80,250,123,0.14) 1px, transparent 1px)", backgroundSize: "34px 34px", maskImage: "radial-gradient(ellipse at 50% 0%, #000 40%, transparent 85%)" }} />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 -z-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-7">
          <div className="text-5xl mb-2 animate-bounce-slow inline-block">🎮</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent drop-shadow">程式副本島</h1>
          <p className="text-sm text-slate-300/80 mt-1">寫 Python 邊玩邊學 · 通關拿 XP 與 Z 幣</p>
          {/* 進度條 */}
          <div className="mt-4 max-w-sm mx-auto">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1"><span>通關進度</span><span>{totalDone}/{totalLevels} · ⭐{totalStars}</span></div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>

        {/* 世界（各遊戲）*/}
        <div className="space-y-4">
          {SECTIONS.map((sec) => (
            <div key={sec.key} className={`rounded-2xl border ${sec.ring} bg-gradient-to-br ${sec.grad} backdrop-blur-sm p-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl drop-shadow">{sec.emoji}</div>
                <div>
                  <div className="font-extrabold text-base">{sec.label}</div>
                  <div className="text-[11px] text-slate-300/70 font-mono">{sec.desc}</div>
                </div>
                <div className="ml-auto text-[11px] text-slate-400">{sec.levels.filter((l) => doneMap[l.id]).length}/{sec.levels.length}</div>
              </div>
              {/* 關卡節點 */}
              <div className="flex flex-wrap gap-2">
                {sec.levels.map((lv, i) => {
                  const st = doneMap[lv.id] ?? 0;
                  const prevDone = i === 0 || doneMap[sec.levels[i - 1].id] != null;
                  const locked = !!user && !prevDone && st === 0;
                  const num = i + 1;
                  if (locked) return (
                    <div key={lv.id} title={lv.title} className="w-12 h-12 rounded-xl bg-black/30 border border-white/10 grid place-items-center text-slate-500"><Lock size={15} /></div>
                  );
                  return (
                    <Link key={lv.id} href={`${sec.base}/${lv.id}`} title={`${lv.title} · +${lv.xp}XP/+${lv.z}Z`}
                      className={`group relative w-12 h-12 rounded-xl grid place-items-center font-extrabold transition hover:scale-110 ${st > 0 ? "bg-gradient-to-br from-amber-400/90 to-yellow-500/80 text-black shadow-lg shadow-amber-500/20" : "bg-white/[0.06] border border-white/15 hover:border-white/40 text-slate-100"}`}>
                      <span className="text-sm">{num}</span>
                      {st > 0 && <span className="absolute -bottom-1.5 text-[9px] leading-none text-amber-300">{"★".repeat(st)}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6">🌴 學習島（學）→ 程式副本島（練）→ 創作者島（創）</p>
      </div>

      <style>{`@keyframes bounce-slow{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.animate-bounce-slow{animation:bounce-slow 2.4s ease-in-out infinite}`}</style>
    </div>
  );
}
