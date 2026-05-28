import { NextRequest, NextResponse } from "next/server";

/**
 * 統一 cron endpoint 認證、三種 input 都吃：
 *   - Authorization: Bearer <CRON_SECRET>     ← Zeabur Cron / GitHub Actions / 付費版 cron-job.org
 *   - x-cron-secret: <CRON_SECRET>            ← 舊風格
 *   - ?secret=<CRON_SECRET>                   ← cron-job.org 免費版只能加 query
 *
 * 用法：
 *   const guard = verifyCronAuth(req);
 *   if (guard) return guard;
 *   // 通過、繼續做事
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { error: "cron_secret_not_set", hint: "Zeabur env 設 CRON_SECRET（≥16 字元）" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  const querySecret = req.nextUrl.searchParams.get("secret") ?? "";

  const ok =
    auth === `Bearer ${expected}` ||
    headerSecret === expected ||
    querySecret === expected;

  if (!ok) {
    return NextResponse.json(
      {
        error: "unauthorized",
        hint: "URL 加 ?secret=YOUR_CRON_SECRET、或 header Authorization: Bearer / x-cron-secret",
      },
      { status: 401 },
    );
  }
  return null;
}
