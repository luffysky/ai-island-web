import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase-server";
import { QUEST_LEVELS } from "@/lib/quest/levels";
import { PAINT_LEVELS } from "@/lib/quest/paint-levels";
import { TURTLE_LEVELS } from "@/lib/quest/turtle-levels";
import { NUMBER_LEVELS } from "@/lib/quest/number-levels";
import { DEBUG_LEVELS } from "@/lib/quest/debug-levels";
import { Gamepad2, Lock } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "程式副本島 — 玩遊戲學寫程式 | AI 島",
  description: "寫 Python 控制機器人、畫圖、畫幾何、解謎、抓蟲，邊玩邊學。每關對應一個程式觀念。",
  alternates: { canonical: "/quest" },
};

type Lv = { id: string; title: string; concept: string; xp: number; z: number };
const SECTIONS: { key: string; emoji: string; label: string; desc: string; base: string; levels: Lv[] }[] = [
  { key: "maze", emoji: "🤖", label: "迷宮機器人", desc: "move / for / if / while — 控制機器人走到旗子", base: "/quest", levels: QUEST_LEVELS },
  { key: "paint", emoji: "🎨", label: "畫圖機器人", desc: "paint() 上色，拼出目標圖案", base: "/quest/paint", levels: PAINT_LEVELS },
  { key: "turtle", emoji: "🐢", label: "Turtle 幾何", desc: "forward / right — 畫出方形、三角、星星", base: "/quest/turtle", levels: TURTLE_LEVELS },
  { key: "number", emoji: "🔢", label: "數字關卡", desc: "變數 + 運算，算出答案開鎖", base: "/quest/number", levels: NUMBER_LEVELS },
  { key: "debug", emoji: "🐛", label: "抓蟲關", desc: "改對壞掉的 code，讓測試通過", base: "/quest/debug", levels: DEBUG_LEVELS },
];

export default async function QuestPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const doneMap: Record<string, number> = {};
  if (user) {
    const { data } = await supabase.from("quest_completions").select("level_id, stars").eq("user_id", user.id);
    for (const r of (data ?? []) as any[]) doneMap[r.level_id] = r.stars;
  }
  const totalDone = Object.keys(doneMap).length;
  const totalLevels = SECTIONS.reduce((s, sec) => s + sec.levels.length, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Gamepad2 size={24} className="text-accent" /> 程式副本島</h1>
        <p className="text-sm text-fg-muted mt-1">寫 Python 邊玩邊學。每關對應一個觀念、通關拿 XP 與 Z 幣。已通關 {totalDone} / {totalLevels}。</p>
      </header>

      <div className="space-y-7">
        {SECTIONS.map((sec) => (
          <section key={sec.key}>
            <div className="mb-2">
              <h2 className="text-lg font-bold inline-flex items-center gap-1.5">{sec.emoji} {sec.label}</h2>
              <p className="text-xs text-fg-muted">{sec.desc}</p>
            </div>
            <div className="space-y-2">
              {sec.levels.map((lv, i) => {
                const st = doneMap[lv.id] ?? 0;
                const prevDone = i === 0 || doneMap[sec.levels[i - 1].id] != null;
                const locked = !!user && !prevDone && st === 0;
                return locked ? (
                  <div key={lv.id} className="bg-bg-card border border-border rounded-xl p-3.5 flex items-center justify-between opacity-55">
                    <div className="text-sm font-bold inline-flex items-center gap-1.5"><Lock size={13} /> {lv.title}</div>
                    <span className="text-xs text-fg-muted">先過上一關</span>
                  </div>
                ) : (
                  <Link key={lv.id} href={`${sec.base}/${lv.id}`} className="group bg-bg-card border border-border rounded-xl p-3.5 flex items-center justify-between hover:border-accent/50 transition">
                    <div className="min-w-0">
                      <div className="text-sm font-bold group-hover:text-accent transition truncate">{lv.title}</div>
                      <div className="text-[11px] text-fg-muted">{lv.concept} · +{lv.xp} XP / +{lv.z} Z</div>
                    </div>
                    <div className="text-amber-400 text-base shrink-0 ml-2">{st > 0 ? "★".repeat(st) + "☆".repeat(3 - st) : <span className="text-fg-muted text-xs">未通關</span>}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
