// 免費 Google 翻譯（server 版、零成本、非 AI、保護程式碼/佔位符）。
// 支援「任意語言互譯」：sl=auto 自動偵測原文語言，翻進目標語言（含中文）。
// 給內容翻譯 cron / batch 用，取代付費 AI。跟 scripts/_lib/gtranslate.mjs 同邏輯。
// 哨兵用數學括號 ⟦N⟧（U+27E6/27E7）：實測 Google 翻譯來回都原樣保留，不會像私有區字元被吃掉→避免程式碼還原失敗。
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 站上支援的語系。任何內容都翻進「這些語系裡、除了原文語言外」的其他語系。 */
export const SUPPORTED_LOCALES = ["zh", "en", "ja", "ko"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** 我們的 locale → Google translate 的目標語碼（tl）。 */
const TL: Record<string, string> = { zh: "zh-TW", en: "en", ja: "ja", ko: "ko" };

/** Google 偵測到的語碼 → 我們的 locale。 */
export function normalizeLocale(googleCode: string): string {
  const c = (googleCode || "").toLowerCase();
  if (c.startsWith("zh")) return "zh";
  if (c.startsWith("en")) return "en";
  if (c.startsWith("ja")) return "ja";
  if (c.startsWith("ko")) return "ko";
  return c.split("-")[0] || "en";
}

/**
 * 免費、離線、瞬間的原文語言猜測（靠 Unicode 區段）。用來：
 * ①render 時判斷「原文語言＝檢視語言就顯示原文、不查 DB」②批次時跳過「原文語言＝目標語言」的識別翻譯。
 * 準則：諺文→ko、日文假名→ja、有漢字且無假名→zh、其餘（拉丁為主）→en。中英混排（漢字+英數）仍判 zh。
 */
export function guessLocale(text: string): string {
  const t = String(text || "");
  if (!t.trim()) return "zh";
  if (/[가-힯]/.test(t)) return "ko";                 // 諺文
  if (/[぀-ヿ]/.test(t)) return "ja";                 // 平假名/片假名
  if (/[㐀-鿿豈-﫿]/.test(t)) return "zh";    // 漢字（無假名）
  return "en";
}

/** 保護不該翻的片段：```fence``` / `inline` / <pre><code> / HTML tag / URL / （選）ICU 佔位符 {name}。 */
export function protect(text: string, opts: { icu?: boolean } = {}): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  const stash = (m: string) => { tokens.push(m); return `⟦${tokens.length - 1}⟧`; };
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, stash);
  t = t.replace(/`[^`\n]*`/g, stash);
  t = t.replace(/<pre[\s\S]*?<\/pre>/gi, stash);
  t = t.replace(/<code[\s\S]*?<\/code>/gi, stash);
  t = t.replace(/<[^>]+>/g, stash);
  t = t.replace(/https?:\/\/[^\s)]+/g, stash);
  if (opts.icu) t = t.replace(/\{[^{}]+\}/g, stash);
  return { masked: t, tokens };
}
function restore(text: string, tokens: string[]): string {
  // 容忍 Google 在括號內外塞空白
  return text.replace(/⟦\s*(\d+)\s*⟧/g, (_, i) => tokens[Number(i)] ?? "");
}
function chunk(text: string, max = 1600): string[] {
  const parts: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if ((cur + "\n" + line).length > max && cur) { parts.push(cur); cur = line; }
    else cur = cur ? cur + "\n" + line : line;
  }
  if (cur) parts.push(cur);
  return parts;
}
async function gcall(text: string, tl: string, sl: string): Promise<{ text: string; src: string }> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
      if (r.status === 429 || r.status >= 500) { await sleep(1200 * 2 ** attempt); continue; }
      if (!r.ok) throw new Error(`google ${r.status}`);
      const data = await r.json();
      const out = (data[0] ?? []).map((seg: any) => seg[0]).join("");
      const src = normalizeLocale(String(data[2] ?? "")); // data[2] = 偵測到的原文語碼
      return { text: out, src };
    } catch (e) { if (attempt === 3) throw e; await sleep(1200 * 2 ** attempt); }
  }
  throw new Error("google translate 重試失敗");
}
/**
 * 翻一段到目標語系（保護 code/佔位符、切塊、節流、還原）。
 * @param target 目標 locale（zh/en/ja/ko）。@param opts.sl 原文語碼、預設 "auto"（自動偵測、支援任意語言）。
 * 回 { translated, src }：src = 偵測到的原文 locale。失敗丟例外。
 */
export async function gtranslateText(
  text: string, target: string, opts: { icu?: boolean; sl?: string } = {},
): Promise<{ translated: string; src: string }> {
  const tl = TL[target] ?? target;
  const sl = opts.sl ?? "auto";
  const { masked, tokens } = protect(text, opts);
  const out: string[] = [];
  let src = "";
  for (const c of chunk(masked)) {
    if (!c.trim()) { out.push(c); continue; }
    const r = await gcall(c, tl, sl);
    out.push(r.text);
    if (!src) src = r.src; // 以第一塊偵測到的語言為準
    await sleep(250);
  }
  return { translated: restore(out.join("\n"), tokens), src: src || guessLocale(text) };
}
