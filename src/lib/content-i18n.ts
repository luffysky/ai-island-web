/**
 * 內容 i18n：DB 內容（章節/lesson/部落格/論壇）翻譯 + 快取。
 * 規則：翻一次快取；存來源中文 hash → 來源改了才重翻，否則永遠用快取。
 * 只在 server 端用（走 service-role + 系統 AI key）。
 */
import crypto from "crypto";
import { unstable_cache, revalidateTag } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { pickModelForUsage } from "@/lib/ai-usage-models";

export type ContentSourceType = "lesson" | "chapter" | "blog" | "forum";

export function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 32);
}

function ctTag(sourceType: ContentSourceType, sourceId: string | number): string {
  return `ct:${sourceType}:${sourceId}`;
}

type TransRow = { field: string; translated: string; source_hash: string };

/**
 * 讀某內容某語言的「全部欄位」翻譯列，包 Next Data Cache（≈ 靜態 JSON + CDN 快取）：
 * 同一 (type,id,locale) 一小時內只查一次 DB、跨所有請求共用；重新翻譯後 revalidateTag 立即失效。
 * → 每次瀏覽幾乎不打 DB；中文改了 hash 不符會在呼叫端 fallback 中文。
 */
async function fetchTranslationRows(
  sourceType: ContentSourceType, sourceId: string | number, locale: string,
): Promise<TransRow[]> {
  return unstable_cache(
    async () => {
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("content_translations")
        .select("field, translated, source_hash")
        .eq("source_type", sourceType).eq("source_id", String(sourceId)).eq("locale", locale);
      return ((data as any[]) ?? []).map((r) => ({ field: r.field, translated: r.translated, source_hash: r.source_hash }));
    },
    ["content-translations", sourceType, String(sourceId), locale],
    { revalidate: 3600, tags: [ctTag(sourceType, sourceId)] },
  )();
}

/** 取快取翻譯：只有 hash 與現在的中文一致才回；否則 null（呼叫端 fallback 中文）。 */
export async function getCachedTranslation(
  sourceType: ContentSourceType, sourceId: string | number, field: string, locale: string, zhText: string,
): Promise<string | null> {
  if (locale === "zh" || !zhText || !zhText.trim()) return null;
  try {
    const rows = await fetchTranslationRows(sourceType, sourceId, locale);
    const row = rows.find((r) => r.field === field);
    if (row && row.source_hash === contentHash(zhText)) return row.translated;
  } catch { /* fallback 中文 */ }
  return null;
}

/** 批次取多個欄位的快取翻譯（走 Data Cache，一次撈整筆內容）。回 { field: translated }（只含 hash 命中的）。 */
export async function getCachedTranslations(
  sourceType: ContentSourceType, sourceId: string | number, locale: string, fields: Record<string, string>,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (locale === "zh") return out;
  try {
    const rows = await fetchTranslationRows(sourceType, sourceId, locale);
    for (const row of rows) {
      const zh = fields[row.field];
      if (zh && row.source_hash === contentHash(zh)) out[row.field] = row.translated;
    }
  } catch { /* fallback 中文 */ }
  return out;
}

/**
 * 一次撈整章（章 meta + 底下所有 lesson）的翻譯列，包 Data Cache：
 * 每 (章, 語言) 一小時只查一次 DB、跨請求共用。hash 比對交給呼叫端。
 */
async function fetchChapterBundle(
  chapterId: string | number, lessonIds: (string | number)[], locale: string,
): Promise<any[]> {
  const ids = [String(chapterId), ...lessonIds.map(String)];
  return unstable_cache(
    async () => {
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("content_translations")
        .select("source_type, source_id, field, translated, source_hash")
        .eq("locale", locale)
        .in("source_id", ids);
      return (data as any[]) ?? [];
    },
    ["chapter-bundle", String(chapterId), locale, String(lessonIds.length)],
    { revalidate: 3600, tags: [ctTag("chapter", chapterId)] },
  )();
}

/**
 * 把整章（含 lessons）覆蓋成目標語言的譯文；非中文才動作、hash 不符 fallback 中文。
 * 只翻已存進 content_translations 的欄位（章 title/subtitle、lesson title/content），其餘保留原文。
 * 不改任何元件——直接回傳翻好的 chapter 物件給 ChapterView 用。
 */
export async function localizeChapter<T extends { id: any; title?: string; subtitle?: string; lessons?: any[] }>(
  chapter: T, locale: string,
): Promise<T> {
  if (locale === "zh" || !chapter) return chapter;
  try {
    const lessons = Array.isArray(chapter.lessons) ? chapter.lessons : [];
    const rows = await fetchChapterBundle(chapter.id, lessons.map((l: any) => l.id), locale);
    const pick = (type: string, id: any, field: string, zh: any): string | undefined => {
      if (zh == null || !String(zh).trim()) return undefined;
      const r = rows.find((x) => x.source_type === type && String(x.source_id) === String(id) && x.field === field);
      return r && r.source_hash === contentHash(String(zh)) ? r.translated : undefined;
    };
    return {
      ...chapter,
      title: pick("chapter", chapter.id, "title", chapter.title) ?? chapter.title,
      subtitle: pick("chapter", chapter.id, "subtitle", (chapter as any).subtitle) ?? (chapter as any).subtitle,
      lessons: lessons.map((l: any) => ({
        ...l,
        title: pick("lesson", l.id, "title", l.title) ?? l.title,
        content: pick("lesson", l.id, "content", l.content) ?? l.content,
      })),
    };
  } catch { return chapter; }
}

/**
 * 章節「列表」批次在地化（/chapters、nav 用）：一次撈所有章的 title/subtitle 譯文、覆蓋。
 * 走 Data Cache（每語言一小時查一次 DB、跨請求共用）；hash 不符或無譯文 → fallback 中文。
 * tag 綁每一章的 ctTag，所以某章翻譯更新（revalidateTag）時這份列表快取也會失效。
 */
export async function localizeChapterMetas<T extends { id: any; title?: string; subtitle?: string }>(
  metas: T[], locale: string,
): Promise<T[]> {
  if (locale === "zh" || !Array.isArray(metas) || metas.length === 0) return metas;
  try {
    const ids = metas.map((m) => String(m.id));
    const rows = await unstable_cache(
      async () => {
        const admin = createSupabaseAdmin();
        const { data } = await admin.from("content_translations")
          .select("source_id, field, translated, source_hash")
          .eq("locale", locale).eq("source_type", "chapter").in("source_id", ids);
        return (data as any[]) ?? [];
      },
      ["chapter-metas", locale, ids.join(",")],
      { revalidate: 3600, tags: metas.map((m) => ctTag("chapter", m.id)) },
    )();
    const pick = (id: any, field: string, zh: any): string | undefined => {
      if (zh == null || !String(zh).trim()) return undefined;
      const r = rows.find((x) => String(x.source_id) === String(id) && x.field === field);
      return r && r.source_hash === contentHash(String(zh)) ? r.translated : undefined;
    };
    return metas.map((m) => ({
      ...m,
      title: pick(m.id, "title", m.title) ?? m.title,
      subtitle: pick(m.id, "subtitle", (m as any).subtitle) ?? (m as any).subtitle,
    }));
  } catch { return metas; }
}

/**
 * 通用「列表」批次在地化（論壇 thread 列表、blog 文章列表用）。
 * 一次撈這批 id 在該語言的譯文、覆蓋指定欄位；走 Data Cache、tag 綁各 item。
 * @param fields 要覆蓋的欄位（如 ["title"] 或 ["title","summary"]）。
 */
export async function localizeList<T extends Record<string, any>>(
  sourceType: ContentSourceType, items: T[], locale: string, fields: string[], idKey: keyof T = "id" as keyof T,
): Promise<T[]> {
  if (locale === "zh" || !Array.isArray(items) || items.length === 0) return items;
  try {
    const ids = items.map((it) => String(it[idKey]));
    const rows = await unstable_cache(
      async () => {
        const admin = createSupabaseAdmin();
        const { data } = await admin.from("content_translations")
          .select("source_id, field, translated, source_hash")
          .eq("locale", locale).eq("source_type", sourceType).in("source_id", ids);
        return (data as any[]) ?? [];
      },
      [`list-${sourceType}`, locale, ids.join(",")],
      { revalidate: 3600, tags: items.map((it) => ctTag(sourceType, it[idKey])) },
    )();
    return items.map((it) => {
      const out: any = { ...it };
      for (const f of fields) {
        const zh = it[f];
        if (zh == null || !String(zh).trim()) continue;
        const r = rows.find((x) => String(x.source_id) === String(it[idKey]) && x.field === f);
        if (r && r.source_hash === contentHash(String(zh))) out[f] = r.translated;
      }
      return out as T;
    });
  } catch { return items; }
}

// ── AI 翻譯（保留 HTML/markdown/程式碼，只翻人看的文字）──
let _aiCache: { provider: string; model: string; apiKey: string } | null = null;
async function getAi(): Promise<{ provider: string; model: string; apiKey: string } | null> {
  if (_aiCache) return _aiCache;
  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true);
  if (!models || models.length === 0) return null;
  const model = (await pickModelForUsage("nami_help" as any, models as any[])) ?? (models as any[]).find((m) => m.provider === "anthropic") ?? (models as any[])[0];
  const { data: sysKey } = await admin.from("ai_api_keys").select("api_key_encrypted, enabled").eq("provider", model.provider).maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return null;
  try {
    _aiCache = { provider: model.provider, model: model.model_name, apiKey: decryptKey((sysKey as any).api_key_encrypted) };
    return _aiCache;
  } catch { return null; }
}

const SYS_TRANSLATE = `You are a professional translator for a programming-learning platform.
Translate the given Traditional Chinese text into natural, fluent English suitable for beginners.
CRITICAL rules:
- Preserve ALL HTML tags, markdown syntax, and code blocks EXACTLY as-is.
- Do NOT translate anything inside <code>, <pre>, or triple-backtick fences, and do NOT translate variable/function names, file names, or code.
- Keep the same structure, headings, and line breaks.
- Keep programming terms in English (e.g., "variable", "function", "for loop").
Return ONLY the translated text — no preamble, no explanations, no wrapping.`;

/** 直接呼叫 AI 翻一段（不碰快取）。失敗回 null。 */
export async function aiTranslate(zhText: string, targetLangLabel = "English"): Promise<string | null> {
  if (!zhText || !zhText.trim()) return null;
  const ai = await getAi();
  if (!ai) return null;
  try {
    const r = await callAI({
      provider: ai.provider as any, model: ai.model, apiKey: ai.apiKey,
      messages: [
        { role: "system", content: SYS_TRANSLATE.replace("English", targetLangLabel) },
        { role: "user", content: zhText },
      ],
      temperature: 0.2, maxTokens: Math.min(8000, Math.ceil(zhText.length * 1.6) + 500),
    });
    const out = (r.text ?? "").trim();
    return out || null;
  } catch { return null; }
}

/** 各來源要翻的表 / id 欄 / 欄位（與 content_translations 的 field 對齊）。 */
export const TRANSLATE_FIELDS: Record<ContentSourceType, { table: string; id: string; fields: string[]; where?: string }> = {
  blog: { table: "user_blog_articles", id: "id", fields: ["title", "summary", "content"], where: "is_public" },
  lesson: { table: "lessons", id: "id", fields: ["title", "content"] },
  chapter: { table: "chapters", id: "id", fields: ["title", "subtitle"] },
  forum: { table: "forum_threads", id: "id", fields: ["title", "content"] },
};

/** 中文以外的目標語系（預設批次翻這些）。 */
export const TARGET_LOCALES = ["en", "ja", "ko"] as const;

/**
 * 批次翻某 scope 某語系：只翻「還沒翻 or 中文變過(hash 不同)」的欄位，翻一次不重翻、可重跑。
 * limit = 本次最多實際翻幾個欄位（控 AI 花費）。給 admin route + cron 共用。
 */
export async function runTranslateBatch(
  scope: ContentSourceType, locale: string, limit: number,
): Promise<{ translated: number; skipped: number }> {
  const cfg = TRANSLATE_FIELDS[scope];
  const admin = createSupabaseAdmin();
  let q = admin.from(cfg.table).select([cfg.id, ...cfg.fields].join(", ")).order("updated_at", { ascending: false }).limit(300);
  if (cfg.where) q = (q as any).eq(cfg.where, true);
  const { data: rows, error } = await q;
  if (error) return { translated: 0, skipped: 0 };

  let translated = 0, skipped = 0, budgetLeft = limit;
  for (const row of ((rows as any[]) ?? [])) {
    if (budgetLeft <= 0) break;
    const id = (row as any)[cfg.id];
    for (const field of cfg.fields) {
      if (budgetLeft <= 0) break;
      const zh = String((row as any)[field] ?? "");
      if (!zh.trim()) continue;
      const cached = await getCachedTranslation(scope, id, field, locale, zh);
      if (cached) { skipped++; continue; }
      const out = await translateAndCache(scope, id, field, locale, zh);
      if (out) { translated++; budgetLeft--; } else skipped++;
    }
  }
  return { translated, skipped };
}

/** 翻譯 + 寫進快取（給 batch/cron 用）。回翻好的字串或 null。 */
export async function translateAndCache(
  sourceType: ContentSourceType, sourceId: string | number, field: string, locale: string, zhText: string,
): Promise<string | null> {
  if (locale === "zh" || !zhText || !zhText.trim()) return null;
  const { LOCALE_AI_LABEL } = await import("@/i18n/request");
  const translated = await aiTranslate(zhText, LOCALE_AI_LABEL[locale] ?? "English");
  if (!translated) return null;
  try {
    const admin = createSupabaseAdmin();
    await admin.from("content_translations").upsert({
      source_type: sourceType, source_id: String(sourceId), field, locale,
      source_hash: contentHash(zhText), translated, updated_at: new Date().toISOString(),
    }, { onConflict: "source_type,source_id,field,locale" });
    // 翻好後讓該內容的 Data Cache 立即失效 → 下次瀏覽讀到新譯文（需在 request scope，否則吞掉）
    try { revalidateTag(ctTag(sourceType, sourceId)); } catch { /* 非 request scope（cron）→ 等 revalidate 過期 */ }
  } catch { /* 寫失敗也回翻譯結果 */ }
  return translated;
}
