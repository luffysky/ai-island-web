/** 筆記間隔複習（簡化版 SM-2）。3 種評分調整下次間隔。 */
export type SrsRating = "forgot" | "hard" | "good";
export type SrsState = { interval_days: number; ease: number; reviews: number };

export function nextSrs(cur: SrsState, rating: SrsRating): SrsState & { due_at: string } {
  let { interval_days, ease, reviews } = cur;
  if (rating === "forgot") {
    interval_days = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else if (rating === "hard") {
    interval_days = Math.max(1, Math.round(interval_days * 1.2));
    ease = Math.max(1.3, ease - 0.15);
  } else {
    interval_days = reviews === 0 ? 1 : reviews === 1 ? 3 : Math.max(1, Math.round(interval_days * ease));
    ease = Math.min(3.0, ease + 0.1);
  }
  reviews += 1;
  const due = new Date(Date.now() + interval_days * 86400_000);
  return { interval_days, ease, reviews, due_at: due.toISOString() };
}

export function isDue(dueAt: string | null | undefined): boolean {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() <= Date.now();
}

/** 友善顯示下次複習：今天到期 / N 天後 */
export function dueLabel(dueAt: string): string {
  const diff = Math.round((new Date(dueAt).getTime() - Date.now()) / 86400_000);
  if (diff <= 0) return "今天複習";
  if (diff === 1) return "明天複習";
  return `${diff} 天後複習`;
}
