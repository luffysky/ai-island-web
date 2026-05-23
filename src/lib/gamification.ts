'use client';

import { createSupabaseBrowser } from './supabase-browser';
import confetti from 'canvas-confetti';
import { xpToLevel } from './types';

/**
 * 遊戲化引擎—中央控制 XP / 成就 / Streak
 *
 * 用法：
 *   const { completeLesson, submitQuiz } = useGamification();
 *   await completeLesson(17, '17.5', { xp: 10 });
 */
export class GamificationEngine {
  private supabase = createSupabaseBrowser();
  private onAchievementUnlocked?: (a: any) => void;
  private onLevelUp?: (newLevel: number) => void;

  constructor(opts?: {
    onAchievementUnlocked?: (a: any) => void;
    onLevelUp?: (newLevel: number) => void;
  }) {
    this.onAchievementUnlocked = opts?.onAchievementUnlocked;
    this.onLevelUp = opts?.onLevelUp;
  }

  /**
   * 完成 lesson —送 XP（動態調整）、更新 streak、可能解鎖成就
   */
  async completeLesson(chapterId: number, lessonId: string, baseXp = 10) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { error: 'not_logged_in' };

    // 1. 取目前 level / streak / last_active / 完成數
    const [{ data: before }, { count: totalLessons }] = await Promise.all([
      this.supabase.from('profiles').select('level, xp, streak_days, last_active_at').eq('id', user.id).single(),
      this.supabase.from('lesson_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ] as any);
    const oldLevel = (before as any)?.level ?? 1;

    // 2. 動態 XP — 用 dynamic-xp 演算法 #4 算最終獎勵
    const { calcXp, isTaipeiWeekend } = await import('./dynamic-xp');
    const daysSinceLastActive = (before as any)?.last_active_at
      ? Math.max(0, Math.floor((Date.now() - new Date((before as any).last_active_at).getTime()) / 86400_000))
      : 0;
    const decision = calcXp({
      baseXp,
      streakDays: (before as any)?.streak_days ?? 0,
      daysSinceLastActive,
      totalLessonsDone: (totalLessons as number) ?? 0,
      isWeekend: isTaipeiWeekend(),
      isBirthday: false,
      hasDoubleCoinBuff: false,
    });
    const xp = decision.finalXp;

    // 3. 寫進度（trigger 會自動加 XP + 更新 streak）
    const { error } = await this.supabase
      .from('lesson_progress')
      .upsert({ user_id: user.id, chapter_id: chapterId, lesson_id: lessonId, xp_awarded: xp });

    if (error) return { error: error.message };

    // 4. 取更新後狀態
    const { data: after } = await this.supabase
      .from('profiles').select('level, xp, streak_days').eq('id', user.id).single();

    if (after && after.level > oldLevel) {
      this.celebrateLevelUp(after.level);
      this.onLevelUp?.(after.level);
    } else {
      this.celebrateXp(xp);
    }

    await this.checkAchievements(user.id, { type: 'lesson_complete', chapterId, lessonId });

    return { success: true, level: after?.level, xp: after?.xp, streak: after?.streak_days, awardedXp: xp, baseXp, multiplier: decision.multiplier };
  }

  /**
   * 提交 quiz
   */
  async submitQuiz(chapterId: number, quizId: string, answers: Record<string, string>, questions: any[]) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { error: 'not_logged_in' };

    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] === q.answer) correct++;
    }
    const total = questions.length;
    const score = Math.round((correct / total) * 100);
    const perfect = correct === total;
    const xpAwarded = perfect ? 100 : Math.round(score * 0.3);
    const zCoinAwarded = perfect ? 20 : 5;

    await this.supabase.from('quiz_attempts').insert({
      user_id: user.id, chapter_id: chapterId, quiz_id: quizId,
      score, total_questions: total, correct,
      xp_awarded: xpAwarded, z_coin_awarded: zCoinAwarded,
    });

    // 加 XP / Z-coin
    await this.addXp(user.id, xpAwarded, perfect ? 'quiz_perfect' : 'quiz_pass', { chapterId });
    await this.addCoin(user.id, zCoinAwarded, perfect ? 'quiz_perfect' : 'quiz_pass');

    if (perfect) {
      this.celebratePerfect();
      await this.checkAchievements(user.id, { type: 'quiz_perfect', chapterId });
    }

    return { success: true, score, correct, perfect, xpAwarded, zCoinAwarded };
  }

  /**
   * 失敗扣血
   */
  async loseHeart() {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;
    await this.supabase.rpc('decrement_hearts', { user_id: user.id });
  }

  /**
   * 加 XP
   */
  private async addXp(userId: string, amount: number, reason: string, meta?: any) {
    await this.supabase.from('xp_events').insert({ user_id: userId, amount, reason, meta });
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;
    const { data } = await this.supabase.from('profiles').select('xp').eq('id', userId).single();
    await this.supabase.from('profiles').update({ xp: (data?.xp ?? 0) + amount }).eq('id', userId);
  }

  /**
   * 加 / 減 Z-coin
   */
  async addCoin(userId: string, amount: number, reason: string) {
    const { data } = await this.supabase.from('profiles').select('z_coin').eq('id', userId).single();
    const newBalance = (data?.z_coin ?? 0) + amount;
    if (newBalance < 0) return { error: 'insufficient_coins' };

    await this.supabase.from('profiles').update({ z_coin: newBalance }).eq('id', userId);
    await this.supabase.from('coin_transactions').insert({
      user_id: userId, amount, balance_after: newBalance, reason,
    });
    return { success: true, balance: newBalance };
  }

  /**
   * 檢查成就解鎖條件
   */
  private async checkAchievements(userId: string, event: { type: string; [k: string]: any }) {
    // 取使用者狀態 + 已解鎖
    const [{ data: profile }, { data: unlocked }, { data: progress }] = await Promise.all([
      this.supabase.from('profiles').select('*').eq('id', userId).single(),
      this.supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
      this.supabase.from('lesson_progress').select('chapter_id, lesson_id').eq('user_id', userId),
    ]);

    if (!profile || !progress) return;
    const has = new Set((unlocked ?? []).map((u: any) => u.achievement_id));
    const toUnlock: string[] = [];

    // first-blood：第一個 lesson
    if (!has.has('first-blood') && progress.length >= 1) toUnlock.push('first-blood');

    // streak 系列
    if (!has.has('streak-7') && profile.streak_days >= 7) toUnlock.push('streak-7');
    if (!has.has('streak-30') && profile.streak_days >= 30) toUnlock.push('streak-30');
    if (!has.has('streak-100') && profile.streak_days >= 100) toUnlock.push('streak-100');

    // level 成就
    if (!has.has('level-10') && profile.level >= 10) toUnlock.push('level-10');
    if (!has.has('level-30') && profile.level >= 30) toUnlock.push('level-30');
    if (!has.has('level-60') && profile.level >= 60) toUnlock.push('level-60');

    // explorer：學過 10 個不同章節
    const uniqueChapters = new Set(progress.map((p: any) => p.chapter_id));
    if (!has.has('explorer') && uniqueChapters.size >= 10) toUnlock.push('explorer');

    // first-chapter：完成第一章
    if (!has.has('first-chapter')) {
      // TODO: 比對章節的 lesson 數
      const ch1Lessons = progress.filter((p: any) => p.chapter_id === 1).length;
      if (ch1Lessons >= 6) toUnlock.push('first-chapter');
    }

    // night-owl：凌晨
    const hour = new Date().getHours();
    if (!has.has('night-owl') && hour >= 2 && hour < 5) {
      // 簡化：3 次以上才解鎖、這裡先記錄
      toUnlock.push('night-owl');
    }

    // perfect quiz
    if (event.type === 'quiz_perfect') {
      if (!has.has('first-quiz-perfect')) toUnlock.push('first-quiz-perfect');
    }

    // 解鎖
    if (toUnlock.length > 0) {
      await this.supabase.from('user_achievements')
        .upsert(toUnlock.map(id => ({ user_id: userId, achievement_id: id })));

      // 取詳情通知
      const { data: details } = await this.supabase
        .from('achievements').select('*').in('id', toUnlock);

      details?.forEach(ach => {
        this.celebrateAchievement(ach);
        this.onAchievementUnlocked?.(ach);
      });
    }
  }

  /**
   * 慶祝特效
   */
  private celebrateXp(amount: number) {
    // 任何 XP 都給一點慶祝、量越大越熱鬧
    const count = amount >= 50 ? 50 : amount >= 20 ? 25 : 14;
    confetti({
      particleCount: count, spread: amount >= 50 ? 60 : 45, origin: { y: 0.7 },
      colors: ['#50fa7b', '#8be9fd', '#ffd700'],
      scalar: 0.9,
    });
  }

  private celebrateLevelUp(level: number) {
    confetti({
      particleCount: 200, spread: 100, origin: { y: 0.6 },
      colors: ['#50fa7b', '#8be9fd', '#ffb86c', '#ff79c6'],
    });
    setTimeout(() => {
      confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } });
    }, 300);
  }

  private celebratePerfect() {
    confetti({
      particleCount: 150, spread: 80, origin: { y: 0.6 },
      colors: ['#ffd700', '#ffed4a', '#50fa7b'],
    });
  }

  private celebrateAchievement(ach: any) {
    const colors = {
      common: ['#50fa7b'],
      rare: ['#8be9fd', '#50fa7b'],
      epic: ['#bd93f9', '#ff79c6', '#8be9fd'],
      legendary: ['#ffd700', '#ff79c6', '#bd93f9', '#50fa7b'],
    };
    confetti({
      particleCount: ach.rarity === 'legendary' ? 300 : 100,
      spread: 100, origin: { y: 0.5 },
      colors: colors[ach.rarity as keyof typeof colors] || colors.common,
    });
  }
}

// React hook 包裝
export function useGamification(opts?: {
  onAchievementUnlocked?: (a: any) => void;
  onLevelUp?: (newLevel: number) => void;
}) {
  return new GamificationEngine(opts);
}
