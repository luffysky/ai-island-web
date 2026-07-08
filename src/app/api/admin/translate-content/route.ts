import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { runTranslateBatch, localesForScope, type ContentSourceType } from "@/lib/content-i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 批次翻譯 DB 內容、寫進 content_translations 快取。
 * 只翻「還沒翻 or 來源中文變過(hash 不同)」的 → 可重複跑、翻一次不重翻。
 * POST { scope: 'blog'|'lesson'|'chapter'|'forum', locale?='en'|'all', limit?=20 }
 *  - locale='all' → 一次翻 en/ja/ko 三語（limit 為每語上限）
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const b = await req.json().catch(() => ({} as any));
  const scope = (["blog", "lesson", "chapter", "forum"].includes(b.scope) ? b.scope : "blog") as ContentSourceType;
  const localeArg = String(b.locale ?? "en");
  const limit = Math.max(1, Math.min(50, Number(b.limit) || 20));
  const locales = localeArg === "all" ? [...localesForScope(scope)] : [localeArg];

  const per: Record<string, { translated: number; skipped: number }> = {};
  let total = 0;
  for (const loc of locales) {
    const r = await runTranslateBatch(scope, loc, limit);
    per[loc] = r;
    total += r.translated;
  }

  return NextResponse.json({
    ok: true, scope, locales, per, total,
    note: total >= limit ? "達到本次上限、可再跑一次續翻" : "此範圍已翻完（或到底）",
  });
}
