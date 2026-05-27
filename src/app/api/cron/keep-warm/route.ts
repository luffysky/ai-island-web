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
  // 兩種驗法擇一通過：
  //   - Authorization: Bearer <secret>  （header 方式、cron-job.org 要付費才能設 header）
  //   - ?secret=<secret> 或 ?key=<secret>（query 方式、cron-job.org 免費 tier 就能用）
  if (secret) {
    const auth = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret") || req.nextUrl.searchParams.get("key");
    const headerOk = auth === `Bearer ${secret}`;
    const queryOk = querySecret === secret;
    if (!headerOk && !queryOk) {
      return NextResponse.json({
        error: "unauthorized",
        hint: "URL 加 ?secret=YOUR_CRON_SECRET、或 header Authorization: Bearer YOUR_CRON_SECRET、或 Zeabur env 刪掉 CRON_SECRET（公開模式、推薦給 warm-up）",
      }, { status: 401 });
    }
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

  // 順手 ping 幾個 cold-prone endpoint
  // discord-interactions GET 已改成「主動預熱」(load key + supabase + decrypt module)、不只 touch route
  // 其他 webhook GET 也都會回 200、ping 即會觸發 Next.js Node runtime 載入並 cache module
  const targets = [
    "/api/discord-interactions",  // 預熱 ed25519 key + supabase + ai-crypto
    "/api/line-webhook",
    "/api/line-webhook-user",
    "/api/telegram-webhook",
  ];

  const results = await Promise.allSettled(
    targets.map((path) =>
      fetch(`${base}${path}`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      }).then(async (r) => {
        // 把 GET 回應的 warmed 資訊一併帶回、cron 才看得到真的暖到沒
        const text = await r.text().catch(() => "");
        return { path, status: r.status, body: text.slice(0, 200) };
      })
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
