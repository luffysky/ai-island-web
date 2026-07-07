import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runTranslateBatch, TARGET_LOCALES, type ContentSourceType } from "@/lib/content-i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 背景把 DB 內容（章/lesson/blog/forum）翻成 en/ja/ko、寫進 content_translations 快取。
 * 只翻「缺的或中文改過的(hash)」、翻一次不重翻、可重跑。前台就從快取(Data Cache)抓、幾乎不打 DB。
 * 花費控制：每 (scope,語言) 每次有上限(?limit，預設 12)、手動 dispatch 觸發、跑多次直到翻完。
 * 用法：GET ?limit=12&scope=chapter（scope 省略＝全部四種）。auth 走 CRON_SECRET。
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 12));
  const only = searchParams.get("scope");
  const scopes: ContentSourceType[] =
    only && ["blog", "lesson", "chapter", "forum"].includes(only)
      ? [only as ContentSourceType]
      : ["chapter", "lesson", "blog", "forum"];

  const report: Record<string, { translated: number; skipped: number }> = {};
  let total = 0;
  for (const scope of scopes) {
    for (const loc of TARGET_LOCALES) {
      const r = await runTranslateBatch(scope, loc, limit);
      report[`${scope}:${loc}`] = r;
      total += r.translated;
    }
  }
  return NextResponse.json({
    ok: true,
    total,
    report,
    note: total > 0 ? "本次有翻譯、可再跑一次續翻直到 total=0" : "全部已翻完（或無新內容）",
  });
}
