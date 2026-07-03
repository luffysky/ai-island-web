/**
 * AI 學習教練 — 每週鼓勵式學習報告
 *
 * computeCoachReport(userId)：
 *   1. 從真實資料表撈近 7 天活動（lesson_progress / daily_quiz_attempts / daily_checkins / srs_reviews）
 *   2. 丟給 admin 可設定的模型（usage: ai_tutor）產出簡短鼓勵式 JSON
 *   3. upsert 進 learning_coach_reports（每人每週一份、unique(user_id, week_start)）
 *
 * AI 失敗時退回「用統計數字組出的保底報告」、絕不讓卡片壞掉。
 */
import { createSupabaseAdmin } from "./supabase-admin";
import { completeForUsage } from "./resolve-usage-ai";

export type CoachReport = {
  thisWeek: string;       // 這週的鼓勵式總結
  stuckOn: string;        // 可能卡住 / 需要注意的地方（可為空字串）
  nextSteps: string[];    // 2~3 個具體下一步
};

export type CoachActivity = {
  lessonsCompleted: number;
  chaptersTouched: number[];
  quizAttempts: number;
  quizAvgPct: number | null;
  quizPassRate: number | null;
  checkinDays: number;
  currentStreak: number;
  srsDue: number;         // 到期待複習
  srsReviewed: number;    // 近 7 天有更新（複習）過的卡
  active: boolean;        // 這週是否有任何活動
};

const DAY = 24 * 60 * 60 * 1000;

/** 該日期所在「週一 00:00」的 YYYY-MM-DD（台灣時間近似、用 UTC 週一）。 */
export function weekStartOf(d: Date = new Date()): string {
  const t = new Date(d.getTime());
  const dow = t.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // 週一為起點
  t.setUTCDate(t.getUTCDate() - diff);
  return t.toISOString().slice(0, 10);
}

/** 撈近 7 天學習活動摘要。全部個別 try、任何一張表掛掉都不阻斷。 */
export async function gatherActivity(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
): Promise<CoachActivity> {
  const now = Date.now();
  const sinceIso = new Date(now - 7 * DAY).toISOString();
  const sinceDate = new Date(now - 7 * DAY).toISOString().slice(0, 10);
  const nowIso = new Date(now).toISOString();

  const [lessonRes, quizRes, checkinRes, srsDueRes, srsRevRes] = await Promise.all([
    admin.from("lesson_progress")
      .select("chapter_id, lesson_id, completed_at")
      .eq("user_id", userId).eq("completed", true)
      .gte("completed_at", sinceIso).limit(200),
    admin.from("daily_quiz_attempts")
      .select("quiz_date, correct, total, pass")
      .eq("user_id", userId).gte("quiz_date", sinceDate).limit(50),
    admin.from("daily_checkins")
      .select("checkin_date, streak_count")
      .eq("user_id", userId).gte("checkin_date", sinceDate)
      .order("checkin_date", { ascending: false }).limit(30),
    admin.from("srs_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).lte("due_at", nowIso),
    admin.from("srs_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("updated_at", sinceIso),
  ]);

  const lessons = (lessonRes.data as any[]) ?? [];
  const quizzes = (quizRes.data as any[]) ?? [];
  const checkins = (checkinRes.data as any[]) ?? [];

  const chaptersTouched = [...new Set(lessons.map((l) => Number(l.chapter_id)).filter(Number.isFinite))].sort((a, b) => a - b);

  let quizAvgPct: number | null = null;
  let quizPassRate: number | null = null;
  if (quizzes.length) {
    const pcts = quizzes.map((q) => {
      const tot = Number(q.total ?? 0);
      return tot > 0 ? (Number(q.correct ?? 0) / tot) * 100 : 0;
    });
    quizAvgPct = Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
    quizPassRate = Math.round((quizzes.filter((q) => q.pass).length / quizzes.length) * 100);
  }

  const currentStreak = checkins.length ? Number(checkins[0].streak_count ?? 0) : 0;
  const lessonsCompleted = lessons.length;
  const quizAttempts = quizzes.length;
  const checkinDays = checkins.length;
  const srsDue = srsDueRes.count ?? 0;
  const srsReviewed = srsRevRes.count ?? 0;

  return {
    lessonsCompleted,
    chaptersTouched,
    quizAttempts,
    quizAvgPct,
    quizPassRate,
    checkinDays,
    currentStreak,
    srsDue,
    srsReviewed,
    active: lessonsCompleted > 0 || quizAttempts > 0 || checkinDays > 0 || srsReviewed > 0,
  };
}

function extractJson(raw: string): any | null {
  if (!raw) return null;
  const fenced = raw.replace(/```(?:json)?/gi, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(fenced.slice(start, end + 1)); } catch { return null; }
}

function clampText(s: any, max: number): string {
  const t = String(s ?? "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

/** AI 掛掉時的保底報告：純用統計數字組，永遠有東西可顯示。 */
function fallbackReport(a: CoachActivity): CoachReport {
  if (!a.active) {
    return {
      thisWeek: "這週還沒看到學習紀錄，沒關係、每個人的節奏不同。找個 10 分鐘、從一個小 lesson 重新開始就好。",
      stuckOn: "",
      nextSteps: ["挑一個你有興趣的章節，完成 1 個 lesson", "做今天的每日測驗暖身", "簽到一次、重新啟動連續紀錄"],
    };
  }
  const bits: string[] = [];
  if (a.lessonsCompleted > 0) bits.push(`完成了 ${a.lessonsCompleted} 個 lesson`);
  if (a.chaptersTouched.length > 0) bits.push(`涉獵 ${a.chaptersTouched.length} 個章節`);
  if (a.quizAttempts > 0 && a.quizAvgPct !== null) bits.push(`做了 ${a.quizAttempts} 次測驗、平均 ${a.quizAvgPct} 分`);
  if (a.currentStreak > 0) bits.push(`連續簽到 ${a.currentStreak} 天`);
  const thisWeek = `這週你${bits.join("、")}，持續在前進、很棒！`;

  let stuckOn = "";
  if (a.quizAvgPct !== null && a.quizAvgPct < 60) stuckOn = "測驗平均偏低，可能有些觀念還沒穩，建議回頭複習錯題。";
  else if (a.srsDue > 0) stuckOn = `有 ${a.srsDue} 張複習卡到期了，趁記憶還在時複習效果最好。`;

  const steps: string[] = [];
  if (a.srsDue > 0) steps.push(`清掉 ${a.srsDue} 張到期複習卡`);
  if (a.quizAvgPct !== null && a.quizAvgPct < 70) steps.push("重做上週答錯的測驗、鞏固弱點");
  steps.push("再完成 1~2 個 lesson、保持手感");
  if (a.currentStreak > 0) steps.push("維持每日簽到、別中斷連續紀錄");

  return { thisWeek, stuckOn, nextSteps: steps.slice(0, 3) };
}

const SYSTEM_PROMPT = `你是繁體中文的「AI 學習教練」，服務對象是正在自學程式的學員。
你會拿到某位學員「近 7 天的學習活動統計數字」，請寫一份簡短、溫暖、鼓勵但誠實的每週回顧。
語氣像一位親切的學長姐、用白話、不要說教、不要浮誇、不要對學員的成就掛保證（如收入/接案/面試）。

**只回傳一個嚴格 JSON 物件、不要任何額外說明、不要 markdown code fence。**
JSON 結構如下：
{
  "thisWeek": "2~3 句、總結這週的學習狀況並給予具體鼓勵（繁中）",
  "stuckOn": "1 句、根據數字點出這週可能卡住或該注意的地方；若看起來一切順利可回空字串",
  "nextSteps": ["2~3 個具體、可馬上執行的下一步建議（繁中、每點簡短一句）"]
}
規則：忠於提供的數字、不要杜撰不存在的活動；nextSteps 給 2 到 3 個；全部繁體中文。`;

function buildUserPrompt(a: CoachActivity): string {
  return [
    "以下是這位學員近 7 天的學習活動統計：",
    `- 完成 lesson 數：${a.lessonsCompleted}`,
    `- 涉獵章節：${a.chaptersTouched.length ? a.chaptersTouched.map((c) => `Ch${c}`).join("、") : "無"}`,
    `- 每日測驗次數：${a.quizAttempts}`,
    `- 測驗平均分數：${a.quizAvgPct === null ? "無資料" : a.quizAvgPct + " 分"}`,
    `- 測驗通過率：${a.quizPassRate === null ? "無資料" : a.quizPassRate + "%"}`,
    `- 本週簽到天數：${a.checkinDays}`,
    `- 目前連續簽到：${a.currentStreak} 天`,
    `- 待複習卡（已到期）：${a.srsDue}`,
    `- 本週複習過的卡：${a.srsReviewed}`,
    "",
    "請依規則產出 JSON。",
  ].join("\n");
}

/** 正規化模型輸出成 CoachReport。 */
function normalize(parsed: any, a: CoachActivity): CoachReport {
  const steps = Array.isArray(parsed?.nextSteps)
    ? parsed.nextSteps.map((x: any) => clampText(x, 200)).filter(Boolean).slice(0, 3)
    : [];
  const thisWeek = clampText(parsed?.thisWeek, 800);
  if (!thisWeek || steps.length === 0) return fallbackReport(a); // 模型給的東西不完整 → 保底
  return { thisWeek, stuckOn: clampText(parsed?.stuckOn, 400), nextSteps: steps };
}

export type ComputeResult = {
  report: CoachReport;
  activity: CoachActivity;
  weekStart: string;
  fellBack: boolean;   // 是否用了保底（AI 失敗 / 無活動）
  saved: boolean;
};

/**
 * 產生（並 upsert）某使用者本週的學習教練報告。
 * @param opts.skipInactive true 時、若這週完全沒活動則不呼叫 AI、也不寫入（給 cron 批次省成本）
 */
export async function computeCoachReport(
  userId: string,
  opts: { weekStart?: string; skipInactive?: boolean } = {},
): Promise<ComputeResult | null> {
  const admin = createSupabaseAdmin();
  const weekStart = opts.weekStart ?? weekStartOf();
  const activity = await gatherActivity(admin, userId);

  if (opts.skipInactive && !activity.active) return null;

  let report: CoachReport;
  let fellBack = false;
  try {
    const { text } = await completeForUsage("ai_tutor", {
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(activity),
      maxTokens: 800,
      temperature: 0.7,
    });
    const parsed = extractJson(text);
    report = parsed ? normalize(parsed, activity) : fallbackReport(activity);
    if (!parsed) fellBack = true;
  } catch (e) {
    console.warn(`[learning-coach] AI 失敗、用保底報告 user=${userId}:`, (e as any)?.message);
    report = fallbackReport(activity);
    fellBack = true;
  }

  let saved = false;
  try {
    const { error } = await admin
      .from("learning_coach_reports")
      .upsert(
        { user_id: userId, week_start: weekStart, report, created_at: new Date().toISOString() },
        { onConflict: "user_id,week_start" },
      );
    saved = !error;
    if (error) console.warn(`[learning-coach] upsert 失敗 user=${userId}:`, error.message);
  } catch (e) {
    console.warn(`[learning-coach] upsert 例外 user=${userId}:`, (e as any)?.message);
  }

  return { report, activity, weekStart, fellBack, saved };
}

/** 讀某使用者最新一份報告（給卡片顯示）。 */
export async function getLatestCoachReport(
  userId: string,
): Promise<{ report: CoachReport; weekStart: string; createdAt: string } | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("learning_coach_reports")
    .select("report, week_start, created_at")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    report: (data as any).report as CoachReport,
    weekStart: (data as any).week_start,
    createdAt: (data as any).created_at,
  };
}
