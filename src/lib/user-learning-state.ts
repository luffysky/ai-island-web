import { createSupabaseAdmin } from "./supabase-admin";

export type LearningState = {
  id: string;
  username: string;
  display_name: string | null;
  level: number;
  xp: number;
  role: string;
  joined_days_ago: number | null;
  last_active_days_ago: number | null;
  current_streak: number;
  longest_streak: number;
  lessons_completed: number;
  chapters_completed: number;
  quiz_avg_30d: number | null;
  quiz_total_30d: number;
  current_chapter_id: number | null;
  current_lesson_id: string | null;
  current_chapter_title: string | null;
  weak_chapters: number[];  // 30 天內 quiz 平均低於 60 的章節
  recent_active_chapters: number[]; // 7 天內有 lesson_progress 的章節
};

// 章節總數從 chapters JSON 算（chapters/page.tsx 也用同一份）
import { SITE_STATS } from "./site-stats";
const CHAPTERS_TOTAL = SITE_STATS.chapterCount;

/**
 * 撈某個 user 的學習狀態聚合
 * 失敗 fallback 給 partial data、不擋 AI 流程
 */
export async function getUserLearningState(userId: string): Promise<LearningState | null> {
  const admin = createSupabaseAdmin();
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, username, display_name, level, xp, role, created_at, last_active_at")
      .eq("id", userId)
      .single();
    if (!profile) return null;

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 86400_000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 86400_000).toISOString();

    const safe = async <T>(p: any, fallback: T): Promise<T> => {
      try {
        const r = await p;
        return (r?.data ?? fallback) as T;
      } catch {
        return fallback;
      }
    };

    const [
      checkins,
      lessons,
      quizzes,
      latest,
      recentLessons,
    ] = await Promise.all([
      safe<any[]>(admin.from("daily_checkins").select("checkin_date, streak_count").eq("user_id", userId).order("checkin_date", { ascending: false }).limit(60), []),
      safe<any[]>(admin.from("lesson_progress").select("chapter_id, lesson_id, completed, completed_at").eq("user_id", userId), []),
      safe<any[]>(admin.from("quiz_attempts").select("chapter_id, score, total_questions, attempted_at").eq("user_id", userId).gte("attempted_at", thirtyDaysAgo), []),
      safe<any>(admin.from("lesson_progress").select("chapter_id, lesson_id").eq("user_id", userId).order("completed_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(), null),
      safe<any[]>(admin.from("lesson_progress").select("chapter_id").eq("user_id", userId).gte("completed_at", sevenDaysAgo), []),
    ]);

    // 連續簽到：daily_checkins.streak_count 是當下寫的、最新一筆若是今/昨天 = current streak
    const checkinArr = checkins as any[];
    let currentStreak = 0;
    let longestStreak = 0;
    if (checkinArr.length > 0) {
      longestStreak = Math.max(...checkinArr.map(c => c.streak_count ?? 0));
      const latestCheckin = checkinArr[0];
      const latestDate = new Date(latestCheckin.checkin_date);
      const dayDiff = Math.floor((now - latestDate.getTime()) / 86400_000);
      if (dayDiff <= 1) currentStreak = latestCheckin.streak_count ?? 0;
    }

    // 完成 lesson / chapter
    const completedLessons = (lessons as any[]).filter(l => l.completed || l.completed_at);
    const completedChapters = new Set(completedLessons.map(l => l.chapter_id));

    // quiz 平均
    const quizArr = quizzes as any[];
    const totalScore = quizArr.reduce((s, q) => s + (q.score / (q.total_questions || 1)) * 100, 0);
    const quizAvg = quizArr.length > 0 ? Math.round(totalScore / quizArr.length) : null;

    // 弱章節：30 天內、某章 quiz 平均 < 60 分
    const byChapter: Record<number, { sum: number; n: number }> = {};
    for (const q of quizArr) {
      if (!q.chapter_id) continue;
      byChapter[q.chapter_id] ||= { sum: 0, n: 0 };
      byChapter[q.chapter_id].sum += (q.score / (q.total_questions || 1)) * 100;
      byChapter[q.chapter_id].n++;
    }
    const weakChapters = Object.entries(byChapter)
      .filter(([, v]) => v.n >= 2 && (v.sum / v.n) < 60)
      .map(([k]) => parseInt(k, 10));

    // 最近 7 天有活動的章節
    const recentChapters = Array.from(new Set((recentLessons as any[]).map(l => l.chapter_id))).filter(Boolean);

    // 取章節標題
    let currentChapterTitle: string | null = null;
    if (latest?.chapter_id) {
      try {
        const { data: ch } = await admin.from("chapters").select("title").eq("id", latest.chapter_id).maybeSingle();
        currentChapterTitle = (ch as any)?.title ?? null;
      } catch {}
    }

    const joinedMs = new Date(profile.created_at).getTime();
    const lastActiveMs = profile.last_active_at ? new Date(profile.last_active_at).getTime() : null;

    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      level: profile.level ?? 1,
      xp: profile.xp ?? 0,
      role: profile.role,
      joined_days_ago: Math.floor((now - joinedMs) / 86400_000),
      last_active_days_ago: lastActiveMs ? Math.floor((now - lastActiveMs) / 86400_000) : null,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      lessons_completed: completedLessons.length,
      chapters_completed: completedChapters.size,
      quiz_avg_30d: quizAvg,
      quiz_total_30d: quizArr.length,
      current_chapter_id: latest?.chapter_id ?? null,
      current_lesson_id: latest?.lesson_id ?? null,
      current_chapter_title: currentChapterTitle,
      weak_chapters: weakChapters,
      recent_active_chapters: recentChapters,
    };
  } catch (e) {
    console.error("[user-learning-state] failed:", e);
    return null;
  }
}

/**
 * 格式化成 system prompt 可讀的學員介紹文字
 */
export function formatLearningStateForPrompt(s: LearningState): string {
  const name = s.display_name || s.username;
  const lines: string[] = [];
  lines.push(`# 你正在跟誰對話`);
  lines.push(`- 名字：**${name}**（@${s.username}）`);
  lines.push(`- 等級：Lv ${s.level}、累計 ${s.xp.toLocaleString()} XP`);
  if (s.role === "admin") lines.push(`- 身份：**管理員**（你可以更專業、不用避諱技術細節）`);
  if (s.joined_days_ago !== null) lines.push(`- 加入 ${s.joined_days_ago} 天`);
  if (s.last_active_days_ago !== null && s.last_active_days_ago > 0) {
    lines.push(`- 上次活動：${s.last_active_days_ago} 天前${s.last_active_days_ago > 7 ? "（中斷一陣子、你可以溫和提一下）" : ""}`);
  }

  lines.push(`\n## 學習進度`);
  lines.push(`- 完成 ${s.lessons_completed} 個 lesson、${s.chapters_completed}/${CHAPTERS_TOTAL} 章`);
  if (s.current_chapter_id) {
    lines.push(`- 目前正在學：**Ch${s.current_chapter_id}${s.current_chapter_title ? ` ${s.current_chapter_title}` : ""}**（lesson \`${s.current_lesson_id}\`）`);
  }
  if (s.recent_active_chapters.length > 0) {
    lines.push(`- 最近 7 天有看過的章節：${s.recent_active_chapters.map(c => `Ch${c}`).join(", ")}`);
  }

  lines.push(`\n## 簽到 / 連續`);
  lines.push(`- 目前連續簽到 ${s.current_streak} 天、最長紀錄 ${s.longest_streak} 天`);

  lines.push(`\n## Quiz 表現（30 天內）`);
  if (s.quiz_avg_30d !== null) {
    lines.push(`- 平均 ${s.quiz_avg_30d} 分（共 ${s.quiz_total_30d} 次測驗）`);
    if (s.weak_chapters.length > 0) {
      lines.push(`- ⚠️ 弱項章節（平均低於 60 分）：${s.weak_chapters.map(c => `Ch${c}`).join(", ")} — 可主動建議複習`);
    }
  } else {
    lines.push(`- 還沒做過測驗`);
  }

  lines.push(`\n## 對話原則`);
  lines.push(`- 直接叫他「${name}」、用個人化方式回應`);
  lines.push(`- 如果他問的剛好是他正在學的章節 / 弱項、優先連結到他的進度`);
  lines.push(`- 不要每次都報數據、只在他問或有助於回答時才提`);
  lines.push(`- ⚠️ **不要把上面這份資料整段念給他聽**、是給你做背景知識用的`);

  return lines.join("\n");
}
