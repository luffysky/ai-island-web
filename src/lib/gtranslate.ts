// 免費 Google 翻譯（server 版、零成本、非 AI、保護程式碼/佔位符）。
// 給內容翻譯 cron / batch 用，取代付費 AI。跟 scripts/_lib/gtranslate.mjs 同邏輯。
const S = "", E = ""; // 私有區 Unicode 哨兵（Google 不會動）
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 保護不該翻的片段：```fence``` / `inline` / <pre><code> / HTML tag / URL / （選）ICU 佔位符 {name}。 */
export function protect(text: string, opts: { icu?: boolean } = {}): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  const stash = (m: string) => { tokens.push(m); return `${S}${tokens.length - 1}${E}`; };
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
  return text.replace(new RegExp(`${S}(\\d+)${E}`, "g"), (_, i) => tokens[Number(i)] ?? "");
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
async function gcall(text: string, tl: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
      if (r.status === 429 || r.status >= 500) { await sleep(1200 * 2 ** attempt); continue; }
      if (!r.ok) throw new Error(`google ${r.status}`);
      const data = await r.json();
      return (data[0] ?? []).map((seg: any) => seg[0]).join("");
    } catch (e) { if (attempt === 3) throw e; await sleep(1200 * 2 ** attempt); }
  }
  throw new Error("google translate 重試失敗");
}
/** 翻一段（保護 code/佔位符、切塊、節流、還原）。tl: en/ja/ko。失敗丟例外。 */
export async function gtranslateText(zh: string, tl: string, opts: { icu?: boolean } = {}): Promise<string> {
  const { masked, tokens } = protect(zh, opts);
  const out: string[] = [];
  for (const c of chunk(masked)) {
    if (!c.trim()) { out.push(c); continue; }
    out.push(await gcall(c, tl));
    await sleep(250);
  }
  return restore(out.join("\n"), tokens);
}
