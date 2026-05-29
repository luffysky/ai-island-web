"use client";
import { useEffect, useState } from "react";
import { Chapter } from "@/lib/types";
import { STAGE_COLORS, DIFFICULTY_LABELS, TIP_LABELS } from "@/lib/utils";
import { chapterDisplayNumber } from "@/lib/chapter-display";
import { GamificationEngine } from "@/lib/gamification";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { LessonCard } from "./LessonCard";
import { BossBattle } from "./BossBattle";
import { EndQuizPlayer } from "./EndQuizPlayer";
import { FloatingNoteButton } from "./FloatingNoteButton";
import { AchievementToast } from "../gamification/AchievementToast";
import { LevelUpModal } from "../gamification/LevelUpModal";
import { XpToast, type XpToastData } from "../gamification/XpToast";
import { ChevronLeft, ChevronRight, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export function ChapterView({ chapter }: { chapter: Chapter }) {
  const { user } = useAuth();
  const notify = useToast();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<any>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [xpToast, setXpToast] = useState<XpToastData | null>(null);
  const supabase = createSupabaseBrowser();
  const stageKey = chapter.stage === "appendix" ? 7 : Number(chapter.stage);
  const stageColor = STAGE_COLORS[stageKey] ?? STAGE_COLORS[1];

  const engine = new GamificationEngine({
    onAchievementUnlocked: (ach) => setToast(ach),
    onLevelUp: (lv) => setLevelUp(lv),
  });

  useEffect(() => {
    if (!user) {
      setCompletedIds(new Set());
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("chapter_id", chapter.id);
      if (!mounted) return;
      setCompletedIds(new Set((data ?? []).map((p: any) => p.lesson_id)));
    })();
    return () => {
      mounted = false;
    };
  }, [chapter.id, user?.id]);

  // URL hash 跳轉到指定 lesson（從 /me/notes「跳到該課」按鈕來）
  // ChapterView 是 client component、初次 mount 時 LessonCard 還沒 render
  // 瀏覽器原生 anchor 跳會失敗、要等 DOM 長出來再手動 scrollIntoView。
  // 注意 lesson id 含 "."（如 "26.0.5"）、querySelector("#lesson-26.0.5") 會把
  // ".0" ".5" 當 class selector、必須用 getElementById 才對得到。
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (!hash || !hash.startsWith("lesson-")) return;
    let retries = 20;
    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // 加 highlight 一下、讓用戶知道在這
        el.classList.add("ring-2", "ring-accent", "ring-offset-2", "ring-offset-bg");
        setTimeout(() => el.classList.remove("ring-2", "ring-accent", "ring-offset-2", "ring-offset-bg"), 2200);
        return;
      }
      if (retries-- > 0) setTimeout(tryScroll, 100);
    };
    setTimeout(tryScroll, 150);
  }, [chapter.id]);

  const handleComplete = async (lessonId: string, xp: number) => {
    if (!user) {
      notify.warning("請先登入才能記錄進度");
      return;
    }
    // 已完成過的不重複給獎勵動畫
    const alreadyDone = completedIds.has(lessonId);
    const res = await engine.completeLesson(chapter.id, lessonId, xp);
    if ((res as any).success) {
      setCompletedIds(prev => new Set([...prev, lessonId]));
      if (!alreadyDone) {
        const r = res as any;
        setXpToast({
          xp,
          levelUp: r.level && levelUp === r.level ? r.level : undefined,
          key: Date.now(),
        });
        // 通知寵物
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("pet:lesson-complete", { detail: { chapterId: chapter.id, lessonId, xp } }));
          window.dispatchEvent(new CustomEvent("pet:xp-earned", { detail: { xp } }));
          // quest 任務
          fetch("/api/quests/progress", {
      credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "complete_lessons", delta: 1 }),
          }).catch(() => {});

          // 島嶼每日學習任務（純客戶端 localStorage）
          import("@/components/island/island-bus").then((m) => m.bumpQuest("lessons", 1)).catch(() => {});
          // 後端發 in-app 通知 + admin LINE
          fetch("/api/me/notify-lesson", {
      credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chapter_id: chapter.id, lesson_id: lessonId, xp }),
          }).catch(() => {});

          // milestone check：跨章節總完成數命中 30/60/100 → dispatch
          const { count } = await supabase
            .from("lesson_progress")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
          if (count != null && (count === 30 || count === 60 || count === 100)) {
            window.dispatchEvent(
              new CustomEvent("pet:milestone-reached", { detail: { count } }),
            );
          }
        }
      }
    }
  };

  const totalLessons = chapter.lessons.length;
  const completedCount = chapter.lessons.filter(l => completedIds.has(l.id)).length;
  const progress = totalLessons > 0 ? completedCount / totalLessons : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-w-0 overflow-hidden">
      {/* Header */}
      <header className="mb-10">
        <div className="text-xs text-fg-muted mb-2">
          CHAPTER {chapterDisplayNumber(chapter)} · {stageColor.emoji} {stageColor.name}
        </div>
        <h1 className="text-4xl font-bold mb-3">
          {chapter.title}
          <span className="block text-xl text-fg-muted mt-2">{chapter.subtitle}</span>
        </h1>
        <p className="text-fg-muted leading-relaxed mb-6">{chapter.description}</p>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-bg-card border border-border">
            <div className="text-xs text-fg-muted">難度</div>
            <div className="font-bold mt-1">{DIFFICULTY_LABELS[chapter.difficulty]}</div>
          </div>
          <div className="p-3 rounded-lg bg-bg-card border border-border">
            <div className="text-xs text-fg-muted flex items-center gap-1"><Clock size={12} /> 時間</div>
            <div className="font-bold mt-1">{chapter.estimatedHours} 小時</div>
          </div>
          <div className="p-3 rounded-lg bg-bg-card border border-border">
            <div className="text-xs text-fg-muted">Lesson</div>
            <div className="font-bold mt-1">{totalLessons} 節</div>
          </div>
          <div className="p-3 rounded-lg bg-bg-card border border-border">
            <div className="text-xs text-fg-muted flex items-center gap-1"><Trophy size={12} /> Boss</div>
            <div className="font-bold mt-1 flex items-center gap-1">
              {chapter.boss ? (
                <>
                  <span>{chapter.boss.emoji}</span>
                  <span className="text-sm truncate">{chapter.boss.name}</span>
                </>
              ) : (
                <span className="text-sm truncate">速查章節</span>
              )}
            </div>
          </div>
        </div>

        {/* Progress — 進度條 + 百分比 + 100% 慶祝色 */}
        {user && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-bg-card to-bg-elevated border border-border mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                📊 章節進度
                {progress >= 1 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-300 font-bold">已完成 🎉</span>}
              </span>
              <span className="font-bold tabular-nums">
                {completedCount} / {totalLessons}
                <span className="text-fg-muted ml-1.5 text-xs">({Math.round(progress * 100)}%)</span>
              </span>
            </div>
            <div className="h-2.5 bg-bg rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress >= 1 ? "bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm shadow-green-500/30" : "bg-gradient-to-r from-accent to-accent-2"}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] text-fg-muted flex items-center justify-between">
              <span>{totalLessons - completedCount > 0 ? `還剩 ${totalLessons - completedCount} 個 lesson` : "全部完成！"}</span>
              {chapter.estimatedHours && totalLessons > 0 && (
                <span>預估 {Math.round(chapter.estimatedHours * 10) / 10} 小時</span>
              )}
            </div>
          </div>
        )}

        {/* Outcomes */}
        {chapter.outcomes && chapter.outcomes.length > 0 && (
          <div className="p-5 rounded-lg bg-bg-card border border-border">
            <h3 className="font-bold mb-3">🎯 完成後你會：</h3>
            <ul className="space-y-1 text-sm">
              {chapter.outcomes.map((o, i) => (
                <li key={i} className="flex gap-2"><span className="text-accent">✓</span>{o}</li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* Lessons */}
      <div className="space-y-4">
        {chapter.lessons.map((lesson, idx) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            index={idx}
            chapterId={chapter.id}
            completed={completedIds.has(lesson.id)}
            onComplete={() => handleComplete(lesson.id, lesson.xp)}
            isLoggedIn={!!user}
          />
        ))}
      </div>

      {/* Boss Battle */}
      {chapter.quiz && chapter.quiz.questions.length > 0 && chapter.boss && (
        <div className="mt-12">
          <BossBattle chapter={chapter} engine={engine} isLoggedIn={!!user} />
        </div>
      )}

      {/* 章末綜合測驗（admin AI 出題） */}
      <EndQuizPlayer chapterId={chapter.id} />

      {/* Summary */}
      {chapter.summary && chapter.summary.length > 0 && (
        <section className="mt-12 p-6 rounded-xl bg-bg-card border border-border">
          <h2 className="text-2xl font-bold mb-4">📚 章節總結</h2>
          <ul className="space-y-2 text-sm">
            {chapter.summary.map((s, i) => (
              <li key={i} className="flex gap-2"><span className="text-accent">→</span>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {chapter.faq && chapter.faq.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-4">❓ 常見 FAQ</h2>
          <div className="space-y-2">
            {chapter.faq.map((f, i) => (
              <details key={i} className="p-4 rounded-lg bg-bg-card border border-border cursor-pointer">
                <summary className="font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-fg-muted leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Floating 筆記按鈕：跟著捲動、隨時對當前 lesson 做筆記 */}
      {user && (
        <FloatingNoteButton
          chapterId={chapter.id}
          lessons={chapter.lessons.map((l) => ({ id: l.id, title: l.title, number: l.number }))}
        />
      )}

      {/* Nav */}
      <nav className="mt-12 flex justify-between">
        {chapter.id > 1 ? (
          <Link href={`/chapters/${chapter.id - 1}`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-border hover:border-accent">
            <ChevronLeft size={16} /> Ch {chapter.id - 1}
          </Link>
        ) : <div />}
        {chapter.id < 70 && (
          <Link href={`/chapters/${chapter.id + 1}`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-border hover:border-accent">
            Ch {chapter.id + 1} <ChevronRight size={16} />
          </Link>
        )}
      </nav>

      {toast && <AchievementToast achievement={toast} onClose={() => setToast(null)} />}
      <XpToast data={xpToast} />
      {levelUp && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
    </div>
  );
}
