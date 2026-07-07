/**
 * 內容 i18n：DB 內容（章節/lesson/部落格/論壇）翻譯 + 快取。
 * 規則：翻一次快取；存來源中文 hash → 來源改了才重翻，否則永遠用快取。
 * 只在 server 端用（走 service-role + 系統 AI key）。
 */
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { pickModelForUsage } from "@/lib/ai-usage-models";

export type ContentSourceType = "lesson" | "chapter" | "blog" | "forum";

export function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/** 取快取翻譯：只有 hash 與現在的中文一致才回；否則 null（呼叫端 fallback 中文）。 */
export async function getCachedTranslation(
  sourceType: ContentSourceType, sourceId: string | number, field: string, locale: string, zhText: string,
): Promise<string | null> {
  if (locale === "zh" || !zhText || !zhText.trim()) return null;
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("content_translations")
      .select("translated, source_hash")
      .eq("source_type", sourceType).eq("source_id", String(sourceId)).eq("field", field).eq("locale", locale)
      .maybeSingle();
    if (data && (data as any).source_hash === contentHash(zhText)) return (data as any).translated;
    return null;
  } catch { return null; }
}

/** 批次取多個欄位的快取翻譯（一次查、少 round trip）。回 { field: translated }（只含 hash 命中的）。 */
export async function getCachedTranslations(
  sourceType: ContentSourceType, sourceId: string | number, locale: string, fields: Record<string, string>,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (locale === "zh") return out;
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("content_translations")
      .select("field, translated, source_hash")
      .eq("source_type", sourceType).eq("source_id", String(sourceId)).eq("locale", locale)
      .in("field", Object.keys(fields));
    for (const row of (data as any[]) ?? []) {
      const zh = fields[row.field];
      if (zh && row.source_hash === contentHash(zh)) out[row.field] = row.translated;
    }
  } catch { /* fallback 中文 */ }
  return out;
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
  } catch { /* 寫失敗也回翻譯結果 */ }
  return translated;
}
