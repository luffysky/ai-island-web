// 免費內容翻譯（零成本、非 AI、Google 翻譯品質、語意流暢）。
// 用免費的 Google Translate 端點（translate.googleapis.com/translate_a/single，client=gtx，免金鑰）。
// 會「保護程式碼」：``` 圍欄 / `inline` / <html tag> / __placeholder__ 換成佔位符不翻、翻完還原 → code 不會被翻壞。
// idempotent：比對 source_hash，已翻的跳過，可安全重跑。
// 用法：
//   node scripts/translate-google-free.mjs <scope> <fieldsCsv> [limit]
//   node scripts/translate-google-free.mjs blog content 300
//   node scripts/translate-google-free.mjs lesson title,content 2000
import pg from "pg";
import crypto from "node:crypto";
import { loadEnv } from "./_lib/ai-crypto.mjs";

const SCOPE = process.argv[2] || "blog";
const FIELDS = (process.argv[3] || "content").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = Number(process.argv[4]) || 500; // 本次最多翻幾個「欄位×語言」
const TABLE = { blog: "user_blog_articles", lesson: "lessons", chapter: "chapters", forum: "forum_threads" }[SCOPE];
const WHERE = SCOPE === "blog" ? "where is_public = true" : "";
const TARGETS = [{ locale: "en", tl: "en" }, { locale: "ja", tl: "ja" }, { locale: "ko", tl: "ko" }];
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex").slice(0, 32);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 用私有區 Unicode 當佔位哨兵（Google 不會動它）
const S = "", E = "";
function protect(text) {
  const tokens = [];
  const stash = (m) => { tokens.push(m); return `${S}${tokens.length - 1}${E}`; };
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, stash);      // markdown 圍欄
  t = t.replace(/`[^`\n]*`/g, stash);            // inline code
  t = t.replace(/<pre[\s\S]*?<\/pre>/gi, stash); // <pre>
  t = t.replace(/<code[\s\S]*?<\/code>/gi, stash); // <code>
  t = t.replace(/<[^>]+>/g, stash);              // 其餘 HTML tag（只保留 tag、翻中間文字）
  t = t.replace(/https?:\/\/[^\s)]+/g, stash);   // 網址
  return { masked: t, tokens };
}
function restore(text, tokens) {
  return text.replace(new RegExp(`${S}(\\d+)${E}`, "g"), (_, i) => tokens[Number(i)] ?? "");
}

// 依行/段切塊、每塊 < ~1600 字（Google GET 端點有長度限制）
function chunk(text, max = 1600) {
  const parts = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if ((cur + "\n" + line).length > max && cur) { parts.push(cur); cur = line; }
    else cur = cur ? cur + "\n" + line : line;
  }
  if (cur) parts.push(cur);
  return parts;
}

async function gtranslate(text, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (r.status === 429 || r.status >= 500) { await sleep(1500 * 2 ** attempt); continue; }
      if (!r.ok) throw new Error(`google ${r.status}`);
      const data = await r.json();
      return (data[0] ?? []).map((seg) => seg[0]).join("");
    } catch (e) {
      if (attempt === 4) throw e;
      await sleep(1500 * 2 ** attempt);
    }
  }
  throw new Error("google translate 重試失敗");
}

async function translateField(zh, tl) {
  const { masked, tokens } = protect(zh);
  const chunks = chunk(masked);
  const out = [];
  for (const ch of chunks) {
    if (!ch.trim()) { out.push(ch); continue; }
    out.push(await gtranslate(ch, tl));
    await sleep(350); // 節流、避免被擋
  }
  return restore(out.join("\n"), tokens);
}

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const { rows } = await c.query(`select id, ${FIELDS.join(", ")} from public.${TABLE} ${WHERE} order by updated_at desc nulls last limit 2000`);
const { rows: ex } = await c.query(`select source_id, field, locale, source_hash from public.content_translations where source_type=$1`, [SCOPE]);
const seen = new Map(ex.map((r) => [`${r.source_id}|${r.field}|${r.locale}`, r.source_hash]));

console.log(`▶️  Google 免費翻譯 scope=${SCOPE} fields=${FIELDS.join(",")} 上限 ${LIMIT}`);
let done = 0, skip = 0, fail = 0, budget = LIMIT;
outer:
for (const row of rows) {
  const id = String(row.id);
  for (const field of FIELDS) {
    const zh = String(row[field] ?? "");
    if (!zh.trim()) continue;
    const h = hash(zh);
    for (const { locale, tl } of TARGETS) {
      if (budget <= 0) break outer;
      if (seen.get(`${id}|${field}|${locale}`) === h) { skip++; continue; }
      try {
        const out = await translateField(zh, tl);
        if (!out || !out.trim()) { fail++; continue; }
        await c.query(
          `insert into public.content_translations (source_type, source_id, field, locale, source_hash, translated, updated_at)
           values ($1,$2,$3,$4,$5,$6, now())
           on conflict (source_type, source_id, field, locale)
           do update set source_hash=excluded.source_hash, translated=excluded.translated, updated_at=now()`,
          [SCOPE, id, field, locale, h, out]);
        done++; budget--;
        if (done % 10 === 0) console.log(`  …已翻 ${done}（剩 ${budget}）`);
      } catch (e) { fail++; console.warn(`  ✗ ${id}/${field}/${locale}: ${e.message}`); }
    }
  }
}
console.log(`\n📊 翻 ${done}、跳過 ${skip}、失敗 ${fail}`);
await c.end();
process.exit(0);
