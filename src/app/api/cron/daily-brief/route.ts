import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { buildDailyBrief } from "@/lib/daily-brief";
import { notifyUserLine } from "@/lib/notify-user-line";
import { buildListCard } from "@/lib/line-flex";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 每日主動推播「今天值得做的 3 件事」到 LINE（opt-in）。
 * 觸發：GET /api/cron/daily-brief?secret=<CRON_SECRET>（建議每天早上一次，如 08:30）。
 * 對象：有綁 LINE + 未關總開關 + 未關「分身島」分類（line_pref_agent）的使用者。
 *   （`notifyUserLine(category:"agent")` 內部會再次核對偏好，關了就不送。）
 * 純推播、不寫任何資料；規則式產生內容、零 AI 成本。
 */
const MAX_USERS = 500; // 保護：一次最多處理的人數上限

export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;
  const admin = createSupabaseAdmin();

  // 候選：綁了 LINE 且沒關總開關的人（分類偏好交給 notifyUserLine 再判）
  const { data: users, error } = await admin
    .from("profiles")
    .select("id")
    .not("line_user_id", "is", null)
    .neq("line_notify_enabled", false)
    .limit(MAX_USERS);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0, skipped = 0, failed = 0;
  for (const u of users ?? []) {
    try {
      const items = await buildDailyBrief(u.id);
      if (!items.length) { skipped++; continue; }
      const text = `🌅 今天值得做的 3 件事\n\n${items.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n（不想收：設定 → 通知偏好可關）`;
      // 美化：改推 Flex 列表卡（清晰的序號清單 + 打開 AI 島按鈕）
      const flex = buildListCard({
        title: "今天值得做的 3 件事",
        emoji: "🌅",
        items: items.map((s) => ({ primary: s })),
        footerButton: { label: "☀️ 打開 AI 島", uri: SITE_URL },
        accentColor: "#f59e0b",
      });
      const r = await notifyUserLine({ userId: u.id, text, flex, category: "agent" });
      if (r.ok) sent++;
      else if (r.reason === "category_disabled" || r.reason === "user_disabled" || r.reason === "not_bound") skipped++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, candidates: users?.length ?? 0, sent, skipped, failed });
}
