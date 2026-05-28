/**
 * 用 Anthropic API 批次生成 ~1000 句程式 / 工程 / 創業 / debug 名言
 * 加進已有的 dev_quotes 表（已 seed 100 句經典）
 *
 * 跑法：node scripts/_oneshot-seed-quotes-1000.mjs
 *
 * 安全：跑前先讀 ai_api_keys.anthropic 解密成 key、用本機 .env.local 的 AI_KEY_SECRET。
 *      如果 production 跟本機 key 不同、會用本機那把（本地驗過有效）。
 *
 * 成本：~20 批 × 50 句 = 1000 句。Claude Haiku 4.5 ~$0.30 total（input ~10k × out ~50k × $.25/$1.25 per MTok）
 */
import pg from "pg";
import { loadEnv, loadProviderKey, pickModelName } from "./_lib/ai-crypto.mjs";

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

// 從 DB 抓 plain key + active model name（不寫死）
const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
const modelName = await pickModelName(c, "anthropic");
console.log(`🤖 使用 model: ${modelName}`);

const before = await c.query(`SELECT COUNT(*) AS n FROM dev_quotes`);
console.log(`📚 目前 dev_quotes 表：${before.rows[0].n} 句`);

const CATEGORIES = [
  "engineering",   // 工程哲學
  "startup",       // 創業
  "debug",         // 除錯 / 失敗
  "mindset",       // 心態 / 成長
  "中文格言",       // 中文哲學
];

const BATCH_SIZE = 50;
const TARGET_BATCHES = 18;  // 18 × 50 = 900 句、加上既有 100 ≈ 1000

const SYSTEM_PROMPT = `你是一位收集了 50 年程式 / 工程 / 創業名言的學者。你會說多國語言、特別熟悉中英文。

每次任務：生 ${BATCH_SIZE} 句不同的、真實存在的名言。

要求：
- 風格多元（哲學、實戰、幽默、批判、勵志、反諷都要有）
- 9 成英文原文 + 1 成直接給中文格言（古文 / 老子 / 莊子 / 孔子 / 韓非子 / 王陽明 / 曾國藩 等）
- 中文翻譯要白話、台灣口語、不要直譯腔（不要翻成「在那裡」「於」「乃」這種文謅謅）
- 作者要真實存在（不要虛構）、寫得出名字就寫、實在不確定寫 "Unknown"
- category 從這 5 選 1：${CATEGORIES.join(" / ")}
- 主題不要重複既有的（除非角度真的不同）

輸出格式：純 JSON array、無 markdown、無解釋、無前後文。每個物件含 4 個欄位：quote / author / translation_zh / category。

範例：
[
  { "quote": "Talk is cheap. Show me the code.", "author": "Linus Torvalds", "translation_zh": "空話便宜、給我看程式碼。", "category": "engineering" },
  { "quote": "天下大事必作於細", "author": "老子", "translation_zh": "天下大事必作於細。", "category": "中文格言" }
]`;

let totalAdded = 0;

for (let i = 0; i < TARGET_BATCHES; i++) {
  console.log(`\n🔥 批次 ${i + 1}/${TARGET_BATCHES}：生 ${BATCH_SIZE} 句...`);
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
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `第 ${i + 1} 批、請生 ${BATCH_SIZE} 句不同主題不同風格的名言。如果是中文格言、quote 跟 translation_zh 寫一樣即可。`,
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
    // 抽出 JSON array
    const m = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!m) {
      console.warn(`  ⚠️ AI 沒回 JSON array、跳過`);
      continue;
    }
    let arr;
    try {
      arr = JSON.parse(m[0]);
    } catch (e) {
      console.warn(`  ⚠️ JSON parse 失敗：${e.message}`);
      continue;
    }
    if (!Array.isArray(arr)) continue;

    // 批次 insert、忽略重複
    let added = 0;
    for (const q of arr) {
      if (!q?.quote || typeof q.quote !== "string") continue;
      try {
        await c.query(
          `INSERT INTO dev_quotes (quote, author, translation_zh, category)
           VALUES ($1, $2, $3, $4)`,
          [
            q.quote.slice(0, 1000),
            (q.author ?? "Unknown").slice(0, 100),
            (q.translation_zh ?? "").slice(0, 1000),
            CATEGORIES.includes(q.category) ? q.category : "engineering",
          ]
        );
        added++;
      } catch {} // 失敗就跳過
    }
    totalAdded += added;
    console.log(`  ✓ +${added}（cumulative +${totalAdded}）`);
  } catch (e) {
    console.warn(`  ✗ 批次失敗：${e.message}`);
  }
}

// 最後去重（同樣 quote 文字保留最早一筆）
console.log("\n🧹 去重中...");
const dedupe = await c.query(`
  DELETE FROM dev_quotes
   WHERE id NOT IN (
     SELECT MIN(id) FROM dev_quotes GROUP BY quote
   )
  RETURNING id
`);
console.log(`  - 刪掉重複 ${dedupe.rowCount} 句`);

const after = await c.query(`SELECT COUNT(*) AS n FROM dev_quotes`);
const byCat = await c.query(`SELECT category, COUNT(*) AS n FROM dev_quotes GROUP BY category ORDER BY n DESC`);
console.log(`\n✨ 完成、dev_quotes 表現在：${after.rows[0].n} 句`);
console.log("分類分布：");
for (const row of byCat.rows) console.log(`  ${row.category}: ${row.n}`);

await c.end();
