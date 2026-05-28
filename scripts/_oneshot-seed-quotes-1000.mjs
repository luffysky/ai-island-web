/**
 * 用 Anthropic API 批次生成程式 / 工程 / 創業 / debug 名言
 * 加進 dev_quotes 表、保證不跟既有重複（DB UNIQUE + AI prompt 避開）
 *
 * 跑法：node scripts/_oneshot-seed-quotes-1000.mjs [批數]
 *      預設 18 批 × 50 句、給數字覆蓋（例：node ... 30 跑 30 批）
 *
 * 防重複機制（兩層）：
 *   1. AI 端：每批 prompt 帶既有 quote 樣本（隨機 120 條 prefix）、明確叫它避開
 *   2. DB 端：dev_quotes.quote UNIQUE constraint + ON CONFLICT (quote) DO NOTHING
 *
 * 每批結束把新生 quote 也加入「已知集合」、下一批的 prompt 樣本會抽到、進一步避免批間重複。
 */
import pg from "pg";
import { loadEnv, loadProviderKey, pickModelName } from "./_lib/ai-crypto.mjs";

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
const modelName = await pickModelName(c, "anthropic");
console.log(`🤖 使用 model: ${modelName}`);

const before = await c.query(`SELECT COUNT(*) AS n FROM dev_quotes`);
console.log(`📚 目前 dev_quotes 表：${before.rows[0].n} 句`);

// 撈全部既有 quote 進 in-memory set、做為防重複的真實來源
const existingRes = await c.query(`SELECT quote, author FROM dev_quotes`);
const knownQuotes = new Set(existingRes.rows.map((r) => r.quote.trim().toLowerCase()));
console.log(`🛡️  已知 ${knownQuotes.size} 句、本次生成會避開`);

const CATEGORIES = [
  "engineering",   // 工程哲學
  "startup",       // 創業
  "debug",         // 除錯 / 失敗
  "mindset",       // 心態 / 成長
  "中文格言",       // 中文哲學
];

const BATCH_SIZE = 50;
const TARGET_BATCHES = Number(process.argv[2]) || 18;
const SAMPLE_PER_BATCH = 120;  // 每批塞給 AI 看的「禁區樣本」上限

// 隨機抽 n 句的 prefix（避免 prompt 太肥）
function pickSamples(n) {
  const pool = Array.from(knownQuotes);
  if (pool.length <= n) return pool;
  const out = [];
  const used = new Set();
  while (out.length < n) {
    const i = Math.floor(Math.random() * pool.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push(pool[i]);
  }
  return out;
}

function buildSystemPrompt(samples) {
  // 樣本只取 prefix 前 60 字符、節省 token
  const banList = samples.map((q) => `- ${q.slice(0, 60)}${q.length > 60 ? "…" : ""}`).join("\n");
  return `你是一位收集了 50 年程式 / 工程 / 創業名言的學者。你會說多國語言、特別熟悉中英文。

每次任務：生 ${BATCH_SIZE} 句不同的、真實存在的名言。

要求：
- 風格多元（哲學、實戰、幽默、批判、勵志、反諷都要有）
- 9 成英文原文 + 1 成直接給中文格言（古文 / 老子 / 莊子 / 孔子 / 韓非子 / 王陽明 / 曾國藩 等）
- 中文翻譯要白話、台灣口語、不要直譯腔（不要翻成「在那裡」「於」「乃」這種文謅謅）
- 作者要真實存在（不要虛構）、寫得出名字就寫、實在不確定寫 "Unknown"
- category 從這 5 選 1：${CATEGORIES.join(" / ")}

**極重要：以下是「已經在資料庫裡」的名言開頭、你絕對不能再產出這些**（不論是改寫、調整大小寫、改標點都不行）：
${banList}

→ 你產出的每一句、quote 欄位都不能跟上面任何一條開頭一樣
→ 也不要互改換句、那種「同意思但換詞」也算重複、跳過
→ 寧可少生幾句、不要重複

輸出格式：純 JSON array、無 markdown、無解釋、無前後文。每個物件含 4 個欄位：quote / author / translation_zh / category。

範例：
[
  { "quote": "Talk is cheap. Show me the code.", "author": "Linus Torvalds", "translation_zh": "空話便宜、給我看程式碼。", "category": "engineering" },
  { "quote": "天下大事必作於細", "author": "老子", "translation_zh": "天下大事必作於細。", "category": "中文格言" }
]`;
}

let totalAdded = 0;
let totalSkippedDuplicates = 0;

for (let i = 0; i < TARGET_BATCHES; i++) {
  const samples = pickSamples(SAMPLE_PER_BATCH);
  const systemPrompt = buildSystemPrompt(samples);
  console.log(`\n🔥 批次 ${i + 1}/${TARGET_BATCHES}：生 ${BATCH_SIZE} 句（餵 AI ${samples.length} 條禁區樣本）...`);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `第 ${i + 1} 批、請生 ${BATCH_SIZE} 句不同主題不同風格的名言。記得避開系統訊息列的禁區清單、寧可少生不要重複。如果是中文格言、quote 跟 translation_zh 寫一樣即可。`,
        }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`  ⚠️ HTTP ${res.status}: ${body.slice(0, 200)}`);
      continue;
    }
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const m = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!m) { console.warn(`  ⚠️ AI 沒回 JSON array、跳過`); continue; }
    let arr;
    try { arr = JSON.parse(m[0]); } catch (e) { console.warn(`  ⚠️ JSON parse: ${e.message}`); continue; }
    if (!Array.isArray(arr)) continue;

    let added = 0;
    let preFiltered = 0;
    let dbDup = 0;
    for (const q of arr) {
      if (!q?.quote || typeof q.quote !== "string") continue;
      const trimmed = q.quote.trim();
      const key = trimmed.toLowerCase();
      // Layer 1: in-memory set 預過濾（包含本次新增的、避免批內重複）
      if (knownQuotes.has(key)) { preFiltered++; continue; }
      // Layer 2: DB UNIQUE 兜底（ON CONFLICT DO NOTHING）
      const ins = await c.query(
        `INSERT INTO dev_quotes (quote, author, translation_zh, category)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (quote) DO NOTHING
         RETURNING id`,
        [
          trimmed.slice(0, 1000),
          (q.author ?? "Unknown").slice(0, 100),
          (q.translation_zh ?? "").slice(0, 1000),
          CATEGORIES.includes(q.category) ? q.category : "engineering",
        ]
      );
      if (ins.rowCount === 0) {
        dbDup++;
      } else {
        added++;
        knownQuotes.add(key);
      }
    }
    totalAdded += added;
    totalSkippedDuplicates += preFiltered + dbDup;
    console.log(`  ✓ +${added}（pre-filter 擋 ${preFiltered}、DB 擋 ${dbDup}、總計 +${totalAdded}）`);
  } catch (e) {
    console.warn(`  ✗ 批次失敗：${e.message}`);
  }
}

console.log(`\n📊 本次共擋下 ${totalSkippedDuplicates} 句重複（pre-filter + DB UNIQUE）`);

const after = await c.query(`SELECT COUNT(*) AS n FROM dev_quotes`);
const byCat = await c.query(`SELECT category, COUNT(*) AS n FROM dev_quotes GROUP BY category ORDER BY n DESC`);
console.log(`\n✨ 完成、dev_quotes 表現在：${after.rows[0].n} 句`);
console.log("分類分布：");
for (const row of byCat.rows) console.log(`  ${row.category}: ${row.n}`);

await c.end();
