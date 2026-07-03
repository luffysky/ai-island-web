// SRS（Spaced Repetition System）錯題複習排程
// Anki 式：答對 → interval × ease、往後排；答錯 → interval 歸 1、明天再來。
// 資料表 srs_reviews（見 supabase/create_srs_reviews_migration.sql）。
import crypto from "crypto";
import { createSupabaseAdmin } from "./supabase-admin";
import type { MiniQuiz } from "./types";

export interface SrsReview {
  id: string;
  lesson_ref: string;
  question_hash: string;
  question: MiniQuiz;
  interval_days: number;
  ease: number;
  due_at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 題目內容 → 穩定雜湊（去重：同一題不重複入列）
export function hashQuestion(item: { question?: string; answer?: string }): string {
  const basis = `${item?.question ?? ""}::${item?.answer ?? ""}`;
  return crypto.createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

function tomorrow(from = Date.now()): string {
  return new Date(from + DAY_MS).toISOString();
}

/**
 * 把一題排入複習佇列（明天到期）。已存在則不覆蓋既有進度（保留 interval/ease/due_at）。
 * 回 { ok }，失敗只記 log、不拋（呼叫端是 fire-and-forget）。
 */
export async function scheduleReview(
  userId: string,
  lessonRef: string,
  questionItem: MiniQuiz,
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !lessonRef || !questionItem?.question) {
    return { ok: false, error: "missing_args" };
  }
  try {
    const admin = createSupabaseAdmin();
    const question_hash = hashQuestion(questionItem);
    // 已存在 → 保留原排程（onConflict 且 ignoreDuplicates），避免答錯重排把進度洗掉
    const { error } = await admin
      .from("srs_reviews")
      .upsert(
        {
          user_id: userId,
          lesson_ref: lessonRef,
          question_hash,
          question: questionItem,
          interval_days: 1,
          ease: 2.5,
          due_at: tomorrow(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_ref,question_hash", ignoreDuplicates: true },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "schedule_failed" };
  }
}

/** 撈今日（含逾期）到期複習題，最舊先。 */
export async function getDueReviews(userId: string, limit = 50): Promise<SrsReview[]> {
  if (!userId) return [];
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("srs_reviews")
    .select("id, lesson_ref, question_hash, question, interval_days, ease, due_at")
    .eq("user_id", userId)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data as SrsReview[]) ?? [];
}

/** 到期複習題數（給 badge / 空狀態判斷）。 */
export async function countDueReviews(userId: string): Promise<number> {
  if (!userId) return 0;
  const admin = createSupabaseAdmin();
  const { count } = await admin
    .from("srs_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("due_at", new Date().toISOString());
  return count ?? 0;
}

/**
 * 評分一題。
 *  - correct：interval = ceil(interval × ease)、ease +0.1（上限 3.0）、往後排。
 *  - wrong：interval = 1、ease -0.2（下限 1.3）、明天再來。
 * 回新的 { interval_days, ease, due_at }。
 */
export async function gradeReview(
  userId: string,
  id: string,
  correct: boolean,
): Promise<{ ok: boolean; interval_days?: number; due_at?: string; error?: string }> {
  if (!userId || !id) return { ok: false, error: "missing_args" };
  const admin = createSupabaseAdmin();
  const { data: row, error: readErr } = await admin
    .from("srs_reviews")
    .select("interval_days, ease")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (readErr || !row) return { ok: false, error: readErr?.message ?? "not_found" };

  const prevInterval = (row as any).interval_days ?? 1;
  const prevEase = (row as any).ease ?? 2.5;

  let interval_days: number;
  let ease: number;
  if (correct) {
    ease = Math.min(3.0, prevEase + 0.1);
    interval_days = Math.max(1, Math.ceil(prevInterval * prevEase));
  } else {
    ease = Math.max(1.3, prevEase - 0.2);
    interval_days = 1;
  }
  const due_at = new Date(Date.now() + interval_days * DAY_MS).toISOString();

  const { error: updErr } = await admin
    .from("srs_reviews")
    .update({ interval_days, ease, due_at, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true, interval_days, due_at };
}
