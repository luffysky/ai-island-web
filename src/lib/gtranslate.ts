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
 * 免費、離線、瞬間的原文語言猜測（比例判斷、非「出現即算」）。用來：
 * ①render 時判斷「原文語言＝檢視語言就顯示原文、不查 DB」②批次時跳過「原文語言＝目標語言」的識別翻譯。
 * 中文內容常夾少量韓/日範例字（教 dict 唸「딕」、舉個日文例），舊版「出現一個假名/諺文就整段判 ja/ko」會誤判。
 * 準則：諺文佔多數→ko；假名達漢字 ~20% 以上（日文必大量混假名）→ja；有漢字→zh；沒 CJK 且有拉丁→en。
 */
export function guessLocale(text: string): string {
  const t = String(text || "");
  if (!t.trim()) return "zh";
  const hangul = (t.match(/[가-힯]/g) || []).length;
  const kana = (t.match(/[぀-ゟ゠-ヿ]/g) || []).length;
  const han = (t.match(/[㐀-鿿豈-﫿]/g) || []).length;
  if (hangul > 0 && hangul >= han && hangul >= kana) return "ko"; // 諺文佔多數
  if (kana > 0 && kana * 5 >= han) return "ja";                    // 假名達漢字 20%↑（日文）
  if (han > 0) return "zh";                                        // 以漢字為主
  return /[a-zA-Z]/.test(t) ? "en" : "zh";
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
// 依「安全切點」切塊、每塊 ≤ max（Google GET 端點有長度限制）。
// 安全切點＝標點/換行/空白/`⟧`(哨兵結尾)，絕不切在 ⟦N⟧ 哨兵中間；找不到才硬切。
// （小說類內容常整篇擠成一行沒換行，只靠換行切會切不動→ URL 太長 → google 400。）
function chunk(text: string, max = 1600): string[] {
  const out: string[] = [];
  let i = 0;
  const SAFE = /[。！？!?\n>⟧、，,；;：: ]/g;
  while (i < text.length) {
    if (text.length - i <= max) { out.push(text.slice(i)); break; }
    const win = text.slice(i, i + max);
    let cut = -1, m: RegExpExecArray | null;
    SAFE.lastIndex = 0;
    while ((m = SAFE.exec(win))) cut = m.index; // window 內最後一個安全切點
    const end = cut >= 0 ? i + cut + 1 : i + max; // 沒安全點就硬切
    out.push(text.slice(i, end));
    i = end;
  }
  return out;
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
