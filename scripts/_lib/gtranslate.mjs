// 免費 Google 翻譯共用核心（零成本、非 AI、保護程式碼/佔位符）。
// 給 translate-sync-all.mjs（DB 內容）、sync-ui-messages.mjs（UI 字串）共用。
// 支援任意語言互譯：sl=auto 自動偵測原文；guessLocale 免費本地猜原文語言（跳過同語言翻譯）。
// 哨兵用數學括號 ⟦N⟧（U+27E6/27E7）：實測 Google 翻譯來回都原樣保留，不會像私有區字元被吃掉→避免 code 還原失敗。
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 免費、離線的原文語言猜測（比例判斷、非「出現即算」）。
 * 中文內容常夾少量韓文/日文範例字（如教 dict 唸「딕」、舉個日文例），
 * 舊版「出現一個假名/諺文就整段判 ja/ko」會誤判→那些中文課反而翻不到該語言。
 * 準則：諺文佔多數→ko；假名達漢字 ~20% 以上（日文必大量混假名）→ja；有漢字→zh；沒 CJK 且有拉丁→en。
 */
export function guessLocale(text) {
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

/** 保護不該翻的片段：``` 圍欄 / `inline` / <pre><code> / HTML tag / URL / ICU 佔位符 {name} {n} */
export function protect(text, { icu = false } = {}) {
  const tokens = [];
  const stash = (m) => { tokens.push(m); return `⟦${tokens.length - 1}⟧`; };
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, stash);
  t = t.replace(/`[^`\n]*`/g, stash);
  t = t.replace(/<pre[\s\S]*?<\/pre>/gi, stash);
  t = t.replace(/<code[\s\S]*?<\/code>/gi, stash);
  t = t.replace(/<[^>]+>/g, stash);
  t = t.replace(/https?:\/\/[^\s)]+/g, stash);
  if (icu) t = t.replace(/\{[^{}]+\}/g, stash); // UI 字串的 {name} {count} 等佔位符
  return { masked: t, tokens };
}
export function restore(text, tokens) {
  return text.replace(/⟦\s*(\d+)\s*⟧/g, (_, i) => tokens[Number(i)] ?? ""); // 容忍括號內外空白
}
// 依安全切點切塊、每塊 ≤ max；絕不切在 ⟦N⟧ 哨兵中間，找不到才硬切（小說類整篇一行也切得動）。
function chunk(text, max = 1600) {
  const out = []; let i = 0;
  const SAFE = /[。！？!?\n>⟧、，,；;：: ]/g;
  while (i < text.length) {
    if (text.length - i <= max) { out.push(text.slice(i)); break; }
    const win = text.slice(i, i + max);
    let cut = -1, m; SAFE.lastIndex = 0;
    while ((m = SAFE.exec(win))) cut = m.index;
    const end = cut >= 0 ? i + cut + 1 : i + max;
    out.push(text.slice(i, end));
    i = end;
  }
  return out;
}
async function gcall(text, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (r.status === 429 || r.status >= 500) { await sleep(1500 * 2 ** attempt); continue; }
      if (!r.ok) throw new Error(`google ${r.status}`);
      const data = await r.json();
      return (data[0] ?? []).map((seg) => seg[0]).join("");
    } catch (e) { if (attempt === 4) throw e; await sleep(1500 * 2 ** attempt); }
  }
  throw new Error("google translate 重試失敗");
}
/** 翻一段（保護 code/佔位符、切塊、節流、還原）。tl: zh-TW/en/ja/ko。 */
export async function translateText(zh, tl, opts = {}) {
  const { masked, tokens } = protect(zh, opts);
  const out = [];
  for (const ch of chunk(masked)) {
    if (!ch.trim()) { out.push(ch); continue; }
    out.push(await gcall(ch, tl));
    await sleep(300);
  }
  return restore(out.join("\n"), tokens);
}
// 站上支援的語系（含中文）。批次時翻進「除了原文語言以外」的語系。
export const TARGETS = [{ locale: "zh", tl: "zh-TW" }, { locale: "en", tl: "en" }, { locale: "ja", tl: "ja" }, { locale: "ko", tl: "ko" }];
