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
// 分片：第 5 參數 "K/N" → 多 Agent 並行時各跑一段（只處理 rowIndex % N === K 的列、不重疊）。省略=全部。
const PART = (() => {
  const m = String(process.argv[5] || "").match(/^(\d+)\s*\/\s*(\d+)$/);
  return m ? { k: Number(m[1]), n: Number(m[2]) } : null;
})();
const TABLE = { blog: "user_blog_articles", lesson: "lessons", chapter: "chapters", forum: "forum_threads" }[SCOPE];
const WHERE = SCOPE === "blog" ? "where is_public = true" : "";
// 站上語系（含中文）：任意語言互譯，翻進「除了原文語言外」的語系。
const ALL_TARGETS = [{ locale: "zh", tl: "zh-TW" }, { locale: "en", tl: "en" }, { locale: "ja", tl: "ja" }, { locale: "ko", tl: "ko" }];
// 官方課程(chapter/lesson)一律中文原著 → 不產生 zh 譯文；使用者內容(blog/forum)才翻進中文。
const TARGETS = ["blog", "forum"].includes(SCOPE) ? ALL_TARGETS : ALL_TARGETS.filter((t) => t.locale !== "zh");
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex").slice(0, 32);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 免費、離線的原文語言猜測：諺文→ko、假名→ja、漢字(無假名)→zh、其餘→en。
function guessLocale(text) {
  const t = String(text || "");
  if (!t.trim()) return "zh";
  if (/[가-힯]/.test(t)) return "ko";
  if (/[぀-ヿ]/.test(t)) return "ja";
  if (/[㐀-鿿豈-﫿]/.test(t)) return "zh";
  return "en";
}

// 用私有區 Unicode 當佔位哨兵（Google 不會動它）
const S = "", E = "";
function protect(text) {
  const tokens = [];
  const stash = (m) => { tokens.push(m); return `⟦${tokens.length - 1}⟧`; };
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
  return text.replace(/⟦\s*(\d+)\s*⟧/g, (_, i) => tokens[Number(i)] ?? "");
}

// 依行/段切塊、每塊 < ~1600 字（Google GET 端點有長度限制）
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

async function gtranslate(text, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
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
const allRows = (await c.query(`select id, ${FIELDS.join(", ")} from public.${TABLE} ${WHERE} order by id limit 5000`)).rows;
const rows = PART ? allRows.filter((_, i) => i % PART.n === PART.k) : allRows;
const { rows: ex } = await c.query(`select source_id, field, locale, source_hash from public.content_translations where source_type=$1`, [SCOPE]);
const seen = new Map(ex.map((r) => [`${r.source_id}|${r.field}|${r.locale}`, r.source_hash]));

console.log(`▶️  Google 免費翻譯 scope=${SCOPE} fields=${FIELDS.join(",")} 上限 ${LIMIT}${PART ? ` 分片 ${PART.k}/${PART.n}(${rows.length}列)` : ""}`);
let done = 0, skip = 0, fail = 0, budget = LIMIT;
outer:
for (const row of rows) {
  const id = String(row.id);
  for (const field of FIELDS) {
    const zh = String(row[field] ?? "");
    if (!zh.trim()) continue;
    const h = hash(zh);
    const srcLoc = guessLocale(zh); // 原文語言 → 只翻進其他語言
    for (const { locale, tl } of TARGETS) {
      if (budget <= 0) break outer;
      if (locale === srcLoc) { skip++; continue; }        // 目標＝原文語言 → 不用翻
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
