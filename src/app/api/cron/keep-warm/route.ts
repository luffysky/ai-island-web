import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Keep-warm endpoint — 給外部 cron（cron-job.org / GitHub Actions）每 4-5 分鐘 ping
 *
 * 目的：防 Discord interaction webhook 冷啟動超過 3 秒造成「未及時回應」
 *
 * 用法（cron-job.org）：
 *   1. 去 cron-job.org 註冊（免費）
 *   2. 建 cronjob、URL = https://ai-island-web.snowrealm.pet/api/cron/keep-warm
 *   3. 排程：Every 4 minutes（避開整點）
 *   4. 不用 auth header（公開、只回 ok）
 *
 * 也可以加 CRON_SECRET：在 header 帶 `Authorization: Bearer ${CRON_SECRET}`
 */
export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const secret = process.env.CRON_SECRET;
  // 如果設了 CRON_SECRET 就驗、沒設就 public
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

  // 順手 ping 幾個 cold-prone endpoint（HEAD request 最輕、不 trigger 業務邏輯）
  const targets = [
    "/api/discord-interactions",
    "/api/line-webhook",
    "/api/line-webhook-user",
    "/api/telegram-webhook",
  ];

  const results = await Promise.allSettled(
    targets.map((path) =>
      fetch(`${base}${path}`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      }).then((r) => ({ path, status: r.status }))
    )
  );

  const summary = results.map((r) =>
    r.status === "fulfilled" ? r.value : { path: "?", error: String((r as any).reason).slice(0, 100) }
  );

  return NextResponse.json({
    ok: true,
    pinged: summary,
    elapsed_ms: Date.now() - t0,
    at: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
