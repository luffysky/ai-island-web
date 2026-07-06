import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase-server";
import { QUEST_LEVELS } from "@/lib/quest/levels";
import { Gamepad2, Lock } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "程式副本島 — 玩遊戲學寫程式 | AI 島",
  description: "寫 Python 控制機器人過關，邊玩邊學迴圈、判斷、函式。每關對應一個程式觀念。",
  alternates: { canonical: "/quest" },
};

export default async function QuestPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const doneMap: Record<string, number> = {};
  if (user) {
    const { data } = await supabase.from("quest_completions").select("level_id, stars").eq("user_id", user.id);
    for (const r of (data ?? []) as any[]) doneMap[r.level_id] = r.stars;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Gamepad2 size={24} className="text-accent" /> 程式副本島</h1>
        <p className="text-sm text-fg-muted mt-1">寫 Python 控制機器人 🤖 走到旗子 🎯。邊玩邊學——每關對應一個程式觀念，通關拿 XP、Z 幣。</p>
      </header>

      <div className="space-y-3">
        {QUEST_LEVELS.map((lv, i) => {
          const stars = doneMap[lv.id] ?? 0;
          // 前一關過了才解鎖（第一關永遠開）
          const prevDone = i === 0 || doneMap[QUEST_LEVELS[i - 1].id] != null;
          const locked = !!user && !prevDone && stars === 0;
          return locked ? (
            <div key={lv.id} className="bg-bg-card border border-border rounded-2xl p-4 flex items-center justify-between opacity-60">
              <div><div className="font-bold inline-flex items-center gap-1.5"><Lock size={14} /> {lv.title}</div><div className="text-xs text-fg-muted mt-0.5">先通過上一關解鎖</div></div>
            </div>
          ) : (
            <Link key={lv.id} href={`/quest/${lv.id}`} className="group bg-bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:border-accent/50 transition">
              <div>
                <div className="font-bold group-hover:text-accent transition">{lv.title}</div>
                <div className="text-xs text-fg-muted mt-0.5">觀念：{lv.concept} · +{lv.xp} XP / +{lv.z} Z</div>
              </div>
              <div className="text-amber-400 text-lg">{stars > 0 ? "★".repeat(stars) + "☆".repeat(3 - stars) : <span className="text-fg-muted text-sm">未通關</span>}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
