"use client";
import { useEffect, useState, useCallback } from "react";
import { Chapter } from "@/lib/types";
import { STAGE_COLORS, DIFFICULTY_LABELS, TIP_LABELS } from "@/lib/utils";
import { chapterDisplayNumber } from "@/lib/chapter-display";
import { trackEvent } from "@/lib/analytics";
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
import { ChevronLeft, ChevronRight, Clock, Trophy, BookmarkCheck, X, BarChart3, Target, BookOpen, HelpCircle, Check, ArrowRight, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { saveReadingPos, getReading, recordEngagement, lessonMastery, hydrateFromServer, setSyncEnabled, formatLessonNumber, type Pos } from "@/lib/reading-position";
import { OfflineSaveButton } from "./OfflineSaveButton";

// 平滑捲到某個 lesson 卡並短暫高亮（跟 hash 跳轉同效果）
function scrollToLesson(lessonId: string) {
  const el = document.getElementById(`lesson-${lessonId}`);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("ring-2", "ring-accent", "ring-offset-2", "ring-offset-bg");
  setTimeout(() => el.classList.remove("ring-2", "ring-accent", "ring-offset-2", "ring-offset-bg"), 2200);
  return true;
}

export function ChapterView({ chapter }: { chapter: Chapter }) {
  const { user } = useAuth();
  const notify = useToast();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<any>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [xpToast, setXpToast] = useState<XpToastData | null>(null);
  // 「繼續上次閱讀」橫幅：furthest=最遠到達（學習進度）、current=上次停留位置（可能在複習前面）
  const [resume, setResume] = useState<{
    furthest?: { lessonId: string; label: string };
    current?: { lessonId: string; label: string };
  } | null>(null);
  // engagement（捲動深度/掌握）更新時 bump、讓 lesson 徽章重算
  const [engTick, setEngTick] = useState(0);
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

  // 算「繼續閱讀」橫幅：furthest=最遠到達（學習進度）、current=上次停留（可能在複習前面）
  const computeResume = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.startsWith("#lesson-")) { setResume(null); return; }
    const rec = getReading(chapter.id);
    if (!rec) { setResume(null); return; }
    const inHere = (id?: string) => !!id && chapter.lessons.some((l) => l.id === id);
    const notFirst = (id?: string) => !!id && chapter.lessons[0]?.id !== id;
    const label = (p?: Pos) => {
      if (!p) return null;
      const num = formatLessonNumber(p.lessonNumber) ?? "段落";
      return p.lessonTitle ? `${num} · ${p.lessonTitle}` : num;
    };
    const far = rec.furthest, cur = rec.current;
    const furthest = inHere(far.lessonId) && notFirst(far.lessonId)
      ? { lessonId: far.lessonId, label: label(far)! } : undefined;
    // current 只有跟 furthest 不同 lesson（= 正在複習前面）才另外顯示
    const current = inHere(cur.lessonId) && cur.lessonId !== far.lessonId
      ? { lessonId: cur.lessonId, label: label(cur)! } : undefined;
    setResume(furthest || current ? { furthest, current } : null);
  }, [chapter.id, chapter.lessons]);

  // 登入後從 DB 拉進度合併（跨裝置）；anon 走 localStorage。完成後重算橫幅。
  useEffect(() => {
    let alive = true;
    if (!user) { setSyncEnabled(false); computeResume(); return; }
    (async () => { await hydrateFromServer(); if (alive) { setEngTick((t) => t + 1); computeResume(); } })();
    return () => { alive = false; };
  }, [user?.id, computeResume]);

  // 捲動追蹤：目前最上方 lesson（存 current+furthest 進度）+ 累計停留時間 + 捲動深度%
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-lesson-id]"));
    if (cards.length === 0) return;
    const visible = new Set<string>();
    let currentId: string | null = null;
    let dwellId: string | null = null;
    let dwellStart = Date.now();
    let saveTimer: ReturnType<typeof setTimeout> | undefined;

    const flushDwell = () => {
      if (dwellId) {
        const ms = Date.now() - dwellStart;
        if (ms > 500 && chapter.lessons.some((l) => l.id === dwellId)) {
          recordEngagement(chapter.id, dwellId, { addDwellMs: ms });
        }
      }
      dwellStart = Date.now();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.lessonId;
          if (!id) continue;
          if (e.isIntersecting) visible.add(id); else visible.delete(id);
        }
        let best: { id: string; top: number } | null = null;
        visible.forEach((id) => {
          const el = document.getElementById(`lesson-${id}`);
          if (!el) return;
          const top = el.getBoundingClientRect().top;
          if (!best || top < best.top) best = { id, top };
        });
        const bestId = best ? (best as { id: string }).id : null;
        if (bestId && bestId !== currentId) {
          currentId = bestId;
          flushDwell();          // 切換 lesson → 結算上一節停留
          dwellId = bestId;
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(() => {
            const idx = chapter.lessons.findIndex((l) => l.id === currentId);
            const lesson = chapter.lessons[idx];
            // furthest 只在 index 前進時才寫（回頭複習不倒退）、current 永遠更新成目前位置
            if (lesson) saveReadingPos({ chapterId: chapter.id, lessonId: lesson.id, lessonIndex: idx, lessonNumber: lesson.number, lessonTitle: lesson.title });
          }, 1200);
        }
      },
      { threshold: [0, 0.25, 0.5] },
    );
    cards.forEach((c) => io.observe(c));

    // 捲動深度：rAF + 700ms throttle、算可見卡讀過比例、記最大值
    let raf = 0, lastDepthAt = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const now = Date.now();
        if (now - lastDepthAt < 700) return;
        lastDepthAt = now;
        const vh = window.innerHeight;
        visible.forEach((id) => {
          const el = document.getElementById(`lesson-${id}`);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (rect.height <= 0) return;
          const depth = Math.max(0, Math.min(1, (vh - rect.top) / rect.height));
          if (depth > 0) recordEngagement(chapter.id, id, { scrollDepth: depth });
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const onHide = () => { if (document.visibilityState === "hidden") flushDwell(); };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      flushDwell();
      io.disconnect();
      if (saveTimer) clearTimeout(saveTimer);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [chapter.id, chapter.lessons]);

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
          trackEvent("lesson_complete", { chapter_id: chapter.id, lesson_id: lessonId, xp });
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

  const [showSkim, setShowSkim] = useState(false);
  const totalLessons = chapter.lessons.length;
  const completedCount = chapter.lessons.filter(l => completedIds.has(l.id)).length;
  const progress = totalLessons > 0 ? completedCount / totalLessons : 0;
  // 掌握度推薦複習：列出「只快速滑過」(skim) 的是哪幾節，點了就跳去細看（engTick 變動時重算）
  const skimLessons = engTick >= 0
    ? chapter.lessons.filter(l => lessonMastery(l.id, completedIds.has(l.id)) === "skim")
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-w-0 overflow-hidden">
      {/* Header */}
      <header className="mb-10">
        <div className="text-xs text-fg-muted mb-2 flex items-center justify-between gap-2 flex-wrap">
          <span>CHAPTER {chapterDisplayNumber(chapter)} · {stageColor.emoji} {stageColor.name}</span>
          <OfflineSaveButton chapterId={chapter.id} />
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
                <BarChart3 size={14} /> 章節進度
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
            {skimLessons.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowSkim(s => !s)}
                  className="text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 hover:underline"
                >
                  🔁 有 {skimLessons.length} 節你只快速滑過、建議回頭細看
                  <span className="text-[10px] text-amber-500/80 inline-flex items-center gap-0.5">{showSkim ? <><ChevronUp size={11} /> 收合</> : <><ChevronDown size={11} /> 看是哪幾節</>}</span>
                </button>
                {showSkim && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {skimLessons.map((l, i) => (
                      <button
                        key={l.id}
                        onClick={() => scrollToLesson(l.id)}
                        className="group text-left text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition flex items-center gap-2"
                      >
                        <span className="font-bold tabular-nums shrink-0">第 {chapter.lessons.indexOf(l) + 1} 節</span>
                        <span className="flex-1 min-w-0 truncate text-fg group-hover:text-amber-700 dark:group-hover:text-amber-200">{l.title}</span>
                        <span className="shrink-0 text-amber-500 group-hover:translate-x-0.5 transition">回頭看 →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Outcomes */}
        {chapter.outcomes && chapter.outcomes.length > 0 && (
          <div className="p-5 rounded-lg bg-bg-card border border-border">
            <h3 className="font-bold mb-3 inline-flex items-center gap-1.5"><Target size={18} /> 完成後你會：</h3>
            <ul className="space-y-1 text-sm">
              {chapter.outcomes.map((o, i) => (
                <li key={i} className="flex gap-2"><Check size={16} className="text-accent shrink-0 mt-0.5" />{o}</li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* 繼續閱讀：學習進度（最遠到達）為主、若正在複習前面再給「回到上次位置」 */}
      {resume && (
        <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <BookmarkCheck size={18} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-fg-muted">
                {resume.furthest ? "你的學習進度（上次學習最後的地方）" : "上次閱讀的位置"}
              </div>
              <div className="truncate text-sm font-semibold">{(resume.furthest ?? resume.current)!.label}</div>
            </div>
            <button
              onClick={() => { scrollToLesson((resume.furthest ?? resume.current)!.lessonId); setResume(null); }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-black transition hover:scale-105"
            >
              {resume.furthest ? "接續學習進度" : "繼續閱讀"} <ArrowRight size={14} />
            </button>
            <button
              onClick={() => setResume(null)}
              aria-label="關閉"
              className="shrink-0 rounded p-1 text-fg-muted hover:bg-bg-elevated hover:text-fg"
            >
              <X size={16} />
            </button>
          </div>
          {/* 正在複習前面 → 另外給「回到上次閱讀的位置」 */}
          {resume.furthest && resume.current && (
            <button
              onClick={() => { scrollToLesson(resume.current!.lessonId); setResume(null); }}
              className="mt-2 ml-[30px] text-xs text-accent hover:underline"
            >
              ↩ 或回到上次閱讀的位置（{resume.current.label}）
            </button>
          )}
        </div>
      )}

      {/* Lessons */}
      <div className="space-y-4">
        {chapter.lessons.map((lesson, idx) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            index={idx}
            chapterId={chapter.id}
            completed={completedIds.has(lesson.id)}
            mastery={engTick >= 0 ? lessonMastery(lesson.id, completedIds.has(lesson.id)) : null}
            onComplete={() => handleComplete(lesson.id, lesson.xp)}
            onEngage={(patch) => recordEngagement(chapter.id, lesson.id, patch)}
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
          <h2 className="text-2xl font-bold mb-4 inline-flex items-center gap-2"><BookOpen size={22} /> 章節總結</h2>
          <ul className="space-y-2 text-sm">
            {chapter.summary.map((s, i) => (
              <li key={i} className="flex gap-2"><ArrowRight size={16} className="text-accent shrink-0 mt-0.5" />{s}</li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {chapter.faq && chapter.faq.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-4 inline-flex items-center gap-2"><HelpCircle size={22} /> 常見 FAQ</h2>
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
