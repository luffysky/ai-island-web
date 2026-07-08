// 免費 Google 翻譯共用核心（零成本、非 AI、保護程式碼/佔位符）。
// 給 translate-sync-all.mjs（DB 內容）、sync-ui-messages.mjs（UI 字串）共用。
const S = "", E = ""; // 私有區 Unicode 哨兵（Google 不會動）
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 保護不該翻的片段：``` 圍欄 / `inline` / <pre><code> / HTML tag / URL / ICU 佔位符 {name} {n} */
export function protect(text, { icu = false } = {}) {
  const tokens = [];
  const stash = (m) => { tokens.push(m); return `${S}${tokens.length - 1}${E}`; };
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
  return text.replace(new RegExp(`${S}(\\d+)${E}`, "g"), (_, i) => tokens[Number(i)] ?? "");
}
function chunk(text, max = 1600) {
  const parts = []; let cur = "";
  for (const line of text.split("\n")) {
    if ((cur + "\n" + line).length > max && cur) { parts.push(cur); cur = line; }
    else cur = cur ? cur + "\n" + line : line;
  }
  if (cur) parts.push(cur);
  return parts;
}
async function gcall(text, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
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
/** 翻一段（保護 code/佔位符、切塊、節流、還原）。tl: en/ja/ko。 */
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
export const TARGETS = [{ locale: "en", tl: "en" }, { locale: "ja", tl: "ja" }, { locale: "ko", tl: "ko" }];
