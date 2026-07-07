import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";
import { getCachedTranslation, translateAndCache, type ContentSourceType } from "@/lib/content-i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 批次翻譯 DB 內容成英文、寫進 content_translations 快取。
 * 只翻「還沒翻 or 來源中文變過(hash 不同)」的 → 可重複跑、翻一次不重翻。
 * POST { scope: 'blog'|'lesson'|'chapter', locale?='en', limit?=20 }
 */
const FIELDS: Record<ContentSourceType, { table: string; id: string; fields: string[]; where?: string }> = {
  blog: { table: "user_blog_articles", id: "id", fields: ["title", "summary", "content"], where: "is_public" },
  lesson: { table: "lessons", id: "id", fields: ["title", "content"] },
  chapter: { table: "chapters", id: "id", fields: ["title", "subtitle"] },
  forum: { table: "forum_threads", id: "id", fields: ["title", "content"] },
};

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const b = await req.json().catch(() => ({} as any));
  const scope = (["blog", "lesson", "chapter", "forum"].includes(b.scope) ? b.scope : "blog") as ContentSourceType;
  const locale = String(b.locale ?? "en");
  const limit = Math.max(1, Math.min(50, Number(b.limit) || 20));
  const cfg = FIELDS[scope];

  const admin = createSupabaseAdmin();
  let q = admin.from(cfg.table).select([cfg.id, ...cfg.fields].join(", ")).order("updated_at", { ascending: false }).limit(300);
  if (cfg.where) q = (q as any).eq(cfg.where, true);
  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let translated = 0, skipped = 0, budgetLeft = limit;
  for (const row of ((rows as any[]) ?? [])) {
    if (budgetLeft <= 0) break;
    const id = row[cfg.id];
    for (const field of cfg.fields) {
      if (budgetLeft <= 0) break;
      const zh = String(row[field] ?? "");
      if (!zh.trim()) continue;
      // 已有新鮮翻譯 → 跳過（翻一次、不重翻）
      const cached = await getCachedTranslation(scope, id, field, locale, zh);
      if (cached) { skipped++; continue; }
      const out = await translateAndCache(scope, id, field, locale, zh);
      if (out) { translated++; budgetLeft--; } else skipped++;
    }
  }

  return NextResponse.json({ ok: true, scope, locale, translated, skipped, note: translated >= limit ? "達到本次上限、可再跑一次續翻" : "此範圍已翻完（或到底）" });
}
