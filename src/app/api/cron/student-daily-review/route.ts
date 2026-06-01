import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { buildSimpleCard } from "@/lib/line-flex";
import { verifyCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 每日 20:00（台灣時間）學員學習回顧 LINE push
 *
 * 觸發：外部 cron 打
 *   GET https://<site>/api/cron/student-daily-review?secret=$CRON_SECRET
 *
 * 台灣 20:00 = UTC 12:00、cron-job.org 設「每天 12:00 UTC」
 *
 * 對「綁定 LINE + line_notify_enabled=true」的學員推播：
 *   📚 今日完成 N 個 lesson
 *   📝 quiz 嘗試 N 次、平均 X 分
 *   ⚠️ 弱項章節 TOP 3（quiz < 60）
 *   🔥 連續簽到 X 天
 *   🛤️ 看完整足跡 → /me/footprint
 *
 * 失敗策略：個別 user push fail 不阻斷其他、寫 error_logs。
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;

  const token = process.env.USER_LINE_CHANNEL_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "no_user_line_token" }, { status: 503 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  const admin = createSupabaseAdmin();

  // 1. 找所有「綁定 LINE + 允許通知」學員
  const { data: targets, error: targetErr } = await admin
    .from("profiles")
    .select("id, line_user_id, display_name, username, streak_days")
    .not("line_user_id", "is", null)
    .eq("line_notify_enabled", true)
    .is("banned_at", null)
    .limit(2000);
  if (targetErr) {
    return NextResponse.json({ error: "profiles_query_failed", message: targetErr.message }, { status: 500 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  let sentCount = 0;
  let failCount = 0;
  const failedUsers: string[] = [];

  for (const p of (targets as any[]) ?? []) {
    try {
      // 並行撈：今日 lesson 完成 + 今日 quiz + 弱項章節
      const [lessonRes, quizRes, weakRes] = await Promise.all([
        admin
          .from("lesson_progress")
          .select("lesson_id, completed_at")
          .eq("user_id", p.id)
          .gte("completed_at", todayStartIso)
          .limit(50),
        admin
          .from("quiz_attempts")
          .select("score_pct")
          .eq("user_id", p.id)
          .gte("created_at", todayStartIso)
          .limit(100),
        admin
          .from("user_weak_chapters")
          .select("chapter_id, avg_pct, attempt_count")
          .eq("user_id", p.id)
          .order("avg_pct", { ascending: true })
          .limit(3),
      ]);

      const lessons = (lessonRes.data as any[]) ?? [];
      const quizzes = (quizRes.data as any[]) ?? [];
      const weaks = (weakRes.data as any[]) ?? [];

      const lessonCount = lessons.length;
      const quizAvg = quizzes.length
        ? quizzes.reduce((s, q) => s + Number(q.score_pct ?? 0), 0) / quizzes.length
        : null;
      const streak = Number(p.streak_days ?? 0);

      // 沒今日紀錄 + 無弱項 → 跳過、不打擾
      if (lessonCount === 0 && quizzes.length === 0 && weaks.length === 0 && streak === 0) {
        continue;
      }

      // 組 Flex 卡（取代純文字、跟整套對話風格一致）
      const bodyLines: string[] = [];
      const metaLines: Array<{ label: string; value: string }> = [];

      if (lessonCount > 0) {
        metaLines.push({ label: "📚 今日完課", value: `${lessonCount} 個 lesson` });
        const ids = lessons.slice(0, 3).map((l) => l.lesson_id).filter(Boolean).join(" · ");
        if (ids) bodyLines.push(`📖 ${ids}${lessons.length > 3 ? " …" : ""}`);
      } else {
        bodyLines.push("📚 今天還沒完課、明天加油 🌱");
      }

      if (quizzes.length > 0 && quizAvg !== null) {
        metaLines.push({ label: "📝 今日 quiz", value: `${quizzes.length} 次・平均 ${quizAvg.toFixed(0)} 分` });
      }
      if (streak > 0) {
        metaLines.push({ label: "🔥 連續簽到", value: `${streak} 天` });
      }
      if (weaks.length > 0) {
        bodyLines.push("");
        bodyLines.push("⚠️ 建議複習弱項：");
        for (const w of weaks.slice(0, 3)) {
          bodyLines.push(`   • Ch${w.chapter_id} (${Number(w.avg_pct).toFixed(0)} 分)`);
        }
      }

      const flex = buildSimpleCard({
        emoji: "🌙",
        title: `${p.display_name || p.username} 今日學習回顧`,
        accentColor: "#a78bfa",   // 紫色（晚上 / 回顧感）
        body: bodyLines.join("\n"),
        meta: metaLines,
        buttons: [
          { label: "🛤️ 看完整足跡", uri: `${site}/me/footprint`, primary: true },
          { label: "📚 繼續學", uri: `${site}/chapters` },
          { label: "⚙️ 關通知", uri: `${site}/settings` },
        ],
      });

      // Push
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: p.line_user_id,
          messages: [{
            ...flex,
            quickReply: {
              items: [
                { type: "action", action: { type: "message", label: "🛤️ 我的足跡", text: "/footprint" } },
                { type: "action", action: { type: "uri", label: "📚 看章節", uri: `${site}/chapters` } },
                { type: "action", action: { type: "uri", label: "⚙️ 設定", uri: `${site}/settings` } },
              ],
            },
          }],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        failCount++;
        failedUsers.push(p.username || p.id);
        const errBody = await res.text().catch(() => "");
        try {
          await admin.from("error_logs").insert({
            source: "cron-student-daily-review",
            level: "warn",
            message: `[push_failed] ${res.status}: ${errBody.slice(0, 200)}`,
            extra: { user_id: p.id, username: p.username, status: res.status },
          });
        } catch {}
      } else {
        sentCount++;
      }
    } catch (e: any) {
      failCount++;
      failedUsers.push(p.username || p.id);
      console.warn(`[cron-student-daily-review] user ${p.username} failed:`, e?.message);
    }
  }

  return NextResponse.json({
    ok: true,
    total_targets: (targets as any[])?.length ?? 0,
    sent: sentCount,
    failed: failCount,
    failed_users: failedUsers.slice(0, 10),
  });
}
