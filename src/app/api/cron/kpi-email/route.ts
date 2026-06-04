import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 每日 / 每週 KPI 報表 email（給 admin）
 *
 * 觸發：外部 cron 每日 09:00 UTC+8 (= UTC 01:00) 打：
 *   GET /api/cron/kpi-email?period=daily&secret=<CRON_SECRET>
 *
 * 認證三選一：Authorization Bearer / x-cron-secret / ?secret=
 *
 * period: daily (預設) / weekly
 *
 * 收件人：ADMIN_EMAILS env (逗號分隔)
 * 寄件人：EMAIL_FROM env
 * Service：Resend（RESEND_API_KEY 設好就會寄、沒設靜默 skip）
 */
export async function GET(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (guard) return guard;

  const period = (req.nextUrl.searchParams.get("period") ?? "daily") as "daily" | "weekly";
  const days = period === "weekly" ? 7 : 1;
  const label = period === "weekly" ? "上週" : "昨日";

  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 86400_000).toISOString();

  // 並行抓本期 + 上期、算對比
  const queries = await Promise.allSettled([
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", prevSince).lt("created_at", since),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", new Date(Date.now() - 86400_000).toISOString()).is("banned_at", null),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", new Date(Date.now() - 7 * 86400_000).toISOString()).is("banned_at", null),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("ai_conversations").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("occurred_at", since),
    admin.from("lesson_progress").select("user_id").gte("completed_at", since).limit(50000),
    admin.from("orders").select("amount_twd:amount, status").gte("created_at", since),
    admin.from("orders").select("amount_twd:amount, status").gte("created_at", prevSince).lt("created_at", since),
  ]);

  const [
    qSignups, qSignupsPrev,
    qDau, qWau,
    qSubs, qAi, qErr,
    qLessons, qOrders, qOrdersPrev,
  ] = queries;

  const num = (q: any) => q.status === "fulfilled" ? (q.value.count ?? 0) : 0;
  const signups = num(qSignups);
  const signupsPrev = num(qSignupsPrev);
  const dau = num(qDau);
  const wau = num(qWau);
  const subs = num(qSubs);
  const aiConvs = num(qAi);
  const errors = num(qErr);

  const lessonRows: any[] = qLessons.status === "fulfilled" ? qLessons.value.data ?? [] : [];
  const lessonCount = lessonRows.length;
  const activeLearners = new Set(lessonRows.map((l: any) => l.user_id)).size;

  const ordersRows: any[] = qOrders.status === "fulfilled" ? qOrders.value.data ?? [] : [];
  const paidOrders = ordersRows.filter((o) => o.status === "paid");
  const revenue = paidOrders.reduce((s, o) => s + Number(o.amount_twd ?? 0), 0);

  const ordersPrevRows: any[] = qOrdersPrev.status === "fulfilled" ? qOrdersPrev.value.data ?? [] : [];
  const revenuePrev = ordersPrevRows
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + Number(o.amount_twd ?? 0), 0);

  const pct = (prev: number, curr: number): string => {
    if (prev === 0) return curr > 0 ? "新出現" : "—";
    const p = ((curr - prev) / prev) * 100;
    const sign = p > 0 ? "+" : "";
    return `${sign}${p.toFixed(0)}%`;
  };

  const subject = `📊 ${label}報表 — AI 島 KPI（${new Date().toLocaleDateString("zh-TW")}）`;
  const html = buildHtml({
    label,
    days,
    signups, signupsPrev,
    dau, wau, subs,
    aiConvs, errors,
    lessonCount, activeLearners,
    revenue, revenuePrev,
    pct,
  });
  const text = buildText({
    label, signups, signupsPrev, dau, wau, subs, aiConvs, errors,
    lessonCount, activeLearners, revenue, revenuePrev, pct,
  });

  // 收件人
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    return NextResponse.json({ ok: false, error: "no_admin_emails_set" });
  }

  // Resend 寄送
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "AI 島 <noreply@ai-island-web.snowrealm.pet>";

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "resend_api_key_not_set",
      preview: { subject, recipients: adminEmails, html_length: html.length },
    });
  }

  const results: any[] = [];
  for (const to of adminEmails) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ from, to, subject, html, text }),
      });
      const j = await res.json();
      results.push({ to, ok: res.ok, id: j.id, error: j.message });
    } catch (e: any) {
      results.push({ to, ok: false, error: e?.message });
    }
  }

  return NextResponse.json({ ok: true, period, sent: results });
}

function buildHtml(opts: any): string {
  const { label, days, signups, signupsPrev, dau, wau, subs, aiConvs, errors, lessonCount, activeLearners, revenue, revenuePrev, pct } = opts;
  const accent = "#50fa7b";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);overflow:hidden;">
      <div style="background:linear-gradient(135deg,${accent},#8be9fd);padding:24px;color:#0a0e14;">
        <div style="font-size:14px;opacity:.85;">🏝️ AI 島 · 自動報表</div>
        <h1 style="margin:6px 0 0;font-size:24px;">${label}重點摘要</h1>
        <div style="margin-top:6px;font-size:12px;opacity:.75;">過去 ${days} 天</div>
      </div>

      <div style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:15px;color:#888;text-transform:uppercase;letter-spacing:.05em;">📈 用戶</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#555;">新註冊</td><td style="text-align:right;font-weight:bold;font-size:18px;">${signups} <span style="font-size:11px;color:#888;font-weight:normal;">(${pct(signupsPrev, signups)})</span></td></tr>
          <tr><td style="padding:8px 0;color:#555;border-top:1px solid #eee;">DAU（24hr 活躍）</td><td style="text-align:right;font-weight:bold;font-size:18px;border-top:1px solid #eee;">${dau}</td></tr>
          <tr><td style="padding:8px 0;color:#555;border-top:1px solid #eee;">WAU（7 日活躍）</td><td style="text-align:right;font-weight:bold;font-size:18px;border-top:1px solid #eee;">${wau}</td></tr>
          <tr><td style="padding:8px 0;color:#555;border-top:1px solid #eee;">活躍訂閱</td><td style="text-align:right;font-weight:bold;font-size:18px;border-top:1px solid #eee;color:#bd93f9;">${subs}</td></tr>
        </table>

        <h2 style="margin:0 0 12px;font-size:15px;color:#888;text-transform:uppercase;letter-spacing:.05em;">📚 學習</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#555;">完成 lesson</td><td style="text-align:right;font-weight:bold;font-size:18px;">${lessonCount} 次</td></tr>
          <tr><td style="padding:8px 0;color:#555;border-top:1px solid #eee;">活躍學員</td><td style="text-align:right;font-weight:bold;font-size:18px;border-top:1px solid #eee;">${activeLearners} 人</td></tr>
          <tr><td style="padding:8px 0;color:#555;border-top:1px solid #eee;">AI 對話</td><td style="text-align:right;font-weight:bold;font-size:18px;border-top:1px solid #eee;color:#8be9fd;">${aiConvs}</td></tr>
        </table>

        <h2 style="margin:0 0 12px;font-size:15px;color:#888;text-transform:uppercase;letter-spacing:.05em;">💰 商務</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#555;">收入</td><td style="text-align:right;font-weight:bold;font-size:20px;color:${accent};">NT$ ${revenue.toLocaleString()} <span style="font-size:11px;color:#888;font-weight:normal;">(${pct(revenuePrev, revenue)})</span></td></tr>
        </table>

        ${errors > 5 ? `
        <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 16px;border-radius:6px;margin-top:16px;">
          <strong style="color:#856404;">⚠️ 錯誤監看</strong>
          <div style="color:#555;font-size:14px;margin-top:4px;">過去 ${days} 天有 <strong>${errors}</strong> 條 error log、建議到 admin/errors 看細節。</div>
        </div>` : ""}

        <div style="margin-top:24px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet"}/${process.env.NEXT_PUBLIC_ADMIN_SLUG ?? "console-x7k2"}/admin/kpi" style="display:inline-block;padding:12px 28px;background:${accent};color:#0a0e14;text-decoration:none;border-radius:24px;font-weight:bold;font-size:14px;">📊 打開後台看細節</a>
        </div>
      </div>

      <div style="background:#fafbfc;padding:16px 24px;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee;">
        這封信由 AI 島自動報表系統發送 · 每日台灣 09:00<br>
        若不想再收、請聯絡開發者調整 cron 設定
      </div>
    </div>
  </div>
</body></html>`;
}

function buildText(opts: any): string {
  const { label, signups, signupsPrev, dau, wau, subs, aiConvs, errors, lessonCount, activeLearners, revenue, revenuePrev, pct } = opts;
  return [
    `🏝️ AI 島 ${label}報表`,
    "",
    "📈 用戶",
    `  新註冊：${signups}（${pct(signupsPrev, signups)}）`,
    `  DAU：${dau}`,
    `  WAU：${wau}`,
    `  活躍訂閱：${subs}`,
    "",
    "📚 學習",
    `  完成 lesson：${lessonCount} 次`,
    `  活躍學員：${activeLearners} 人`,
    `  AI 對話：${aiConvs}`,
    "",
    "💰 商務",
    `  收入：NT$ ${revenue.toLocaleString()}（${pct(revenuePrev, revenue)}）`,
    errors > 5 ? `\n⚠️ 錯誤：${errors} 條` : "",
  ].filter(Boolean).join("\n");
}
