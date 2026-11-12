import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { gtranslateText } from "@/lib/gtranslate";
import { clientIp, enforceRateLimit } from "@/lib/with-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TARGETS = new Set(["en", "ja", "ko"]);
const MAX_TEXTS = 60;
const MAX_LEN = 600;
const HAN = /[㐀-鿿]/;
// 一次請求最多花這麼久翻新字串；沒翻完的下次再補，避免卡住頁面
const BUDGET_MS = 20_000;

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 32);

/**
 * POST /api/i18n/ui  { locale, texts: string[] } → { translations: { [原文]: 譯文 } }
 * 給 AutoTranslate 用：介面上還寫死的中文，先查 ui_translations 快取，沒有才用免費 Google 翻並存起來。
 */
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit({ key: `ui-i18n:${clientIp(req)}`, limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const locale = String(body.locale ?? "");
  if (!TARGETS.has(locale)) return NextResponse.json({ error: "unsupported locale" }, { status: 400 });
  const texts: string[] = Array.isArray(body.texts)
    ? [...new Set<string>(body.texts.map((t: unknown) => String(t ?? "").trim()))]
        .filter((t) => t.length > 0 && t.length <= MAX_LEN && HAN.test(t))
        .slice(0, MAX_TEXTS)
    : [];
  if (texts.length === 0) return NextResponse.json({ translations: {} });

  const admin = createSupabaseAdmin();
  const byHash = new Map(texts.map((t) => [hash(t), t]));
  const out: Record<string, string> = {};
  const { data } = await admin
    .from("ui_translations")
    .select("source_hash, translated")
    .eq("locale", locale)
    .in("source_hash", [...byHash.keys()]);
  for (const row of data ?? []) {
    const src = byHash.get(row.source_hash);
    if (src) out[src] = row.translated;
  }

  const missing = texts.filter((t) => !(t in out));
  const deadline = Date.now() + BUDGET_MS;
  const fresh: { source_hash: string; locale: string; source: string; translated: string }[] = [];
  const keep = (src: string, translated: string) => {
    const value = translated.trim();
    if (!value) return;
    out[src] = value;
    fresh.push({ source_hash: hash(src), locale, source: src, translated: value });
  };

  // 單行字串用換行串成一組一次翻（Google 會保留換行），一頁幾十個字串只要打幾次。
  // 回來的行數對不上，或本身有換行的字串，才逐一翻。
  const groups: string[][] = [];
  const singles: string[] = [];
  let cur: string[] = [];
  let len = 0;
  for (const t of missing) {
    if (t.includes("\n")) { singles.push(t); continue; }
    if (cur.length && (len + t.length > 1200 || cur.length >= 40)) { groups.push(cur); cur = []; len = 0; }
    cur.push(t);
    len += t.length + 1;
  }
  if (cur.length) groups.push(cur);

  const translateGroup = async (group: string[]) => {
    const r = await gtranslateText(group.join("\n"), locale, { sl: "zh-TW", icu: true });
    const lines = r.translated.split("\n");
    if (lines.length === group.length) group.forEach((src, i) => keep(src, lines[i]));
    else singles.push(...group);
  };
  // 同時最多 3 個請求，免費端點太密會被擋
  for (let i = 0; i < groups.length && Date.now() < deadline; i += 3) {
    await Promise.allSettled(groups.slice(i, i + 3).map(translateGroup));
  }
  for (let i = 0; i < singles.length && Date.now() < deadline; i += 4) {
    const batch = singles.slice(i, i + 4);
    const results = await Promise.allSettled(batch.map((t) => gtranslateText(t, locale, { sl: "zh-TW", icu: true })));
    results.forEach((r, j) => { if (r.status === "fulfilled") keep(batch[j], r.value.translated); });
  }
  if (fresh.length) {
    await admin.from("ui_translations").upsert(fresh, { onConflict: "source_hash,locale", ignoreDuplicates: true });
  }

  return NextResponse.json({ translations: out, pending: missing.length - fresh.length });
}
