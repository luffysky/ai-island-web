/**
 * 把 lessons + forum_threads 全部跑一次 OpenAI embedding、寫進 embedding 欄位
 *
 * 用法：
 *   node scripts/backfill_embeddings.mjs              # 跑兩個表
 *   node scripts/backfill_embeddings.mjs lessons      # 只跑 lessons
 *   node scripts/backfill_embeddings.mjs forum        # 只跑 forum_threads
 *   node scripts/backfill_embeddings.mjs --force      # 重算（即使已有 embedding）
 *
 * 依賴：
 *   - .env.local 要有 SUPABASE_DB_URL 跟 OPENAI_API_KEY（後者單獨環境變數、不從 ai_api_keys decrypt、避免 node 直接跑要載 crypto）
 *
 * 成本估算：text-embedding-3-small = $0.00002 / 1K tokens、單一 lesson 約 1000 token、750 lesson ≈ $0.015 一次跑全部
 */
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

function loadEnv() {
  if (!existsSync(".env.local")) {
    console.error("❌ .env.local 不存在");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv();
const DB_URL = env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;
const OPENAI_KEY = env.OPENAI_API_KEY_RAW || env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
if (!DB_URL) { console.error("❌ SUPABASE_DB_URL not set"); process.exit(1); }
if (!OPENAI_KEY) {
  console.error("❌ OPENAI_API_KEY (或 OPENAI_API_KEY_RAW) 沒設、加進 .env.local 一次性即可");
  console.error("   (純 backfill 用、不會 commit、跟線上 ai_api_keys 不同)");
  process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const targets = args.filter((a) => !a.startsWith("--"));
const RUN_LESSONS = targets.length === 0 || targets.includes("lessons");
const RUN_FORUM = targets.length === 0 || targets.includes("forum");

const EMBED_MODEL = "text-embedding-3-small";

async function embedBatch(texts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI ${res.status}: ${err.slice(0, 300)}`);
    }
    const data = await res.json();
    return data.data.map((d) => d.embedding);
  } finally {
    clearTimeout(t);
  }
}

function toVector(arr) {
  return `[${arr.join(",")}]`;
}

async function backfillLessons(client) {
  console.log("\n=== Lessons backfill ===");
  const where = FORCE ? "" : "WHERE embedding IS NULL";
  const { rows } = await client.query(
    `SELECT id, chapter_id, number, title, one_line_summary, analogy, content
     FROM public.lessons ${where} ORDER BY chapter_id, sort_order`
  );
  console.log(`找到 ${rows.length} 個 lesson 要 embed`);
  if (rows.length === 0) return;

  const BATCH = 20;  // OpenAI 一次最多 2048 input、20 個保守
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const texts = batch.map((r) =>
      [
        `Chapter ${r.chapter_id} Lesson ${r.number}: ${r.title}`,
        r.one_line_summary || "",
        r.analogy || "",
        (r.content || "").slice(0, 6000),
      ].filter(Boolean).join("\n\n")
    );
    try {
      const vecs = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) {
        await client.query(
          `UPDATE public.lessons SET embedding = $1, embedding_updated_at = NOW() WHERE id = $2`,
          [toVector(vecs[j]), batch[j].id],
        );
      }
      done += batch.length;
      console.log(`  ${done}/${rows.length}`);
    } catch (e) {
      console.warn(`  batch ${i} 失敗：${e.message}`);
    }
  }
  console.log(`✅ Lessons 完成 ${done}/${rows.length}`);
}

async function backfillForum(client) {
  console.log("\n=== Forum threads backfill ===");
  const where = FORCE ? "" : "WHERE embedding IS NULL";
  const { rows } = await client.query(
    `SELECT id, title, content FROM public.forum_threads ${where} ORDER BY created_at DESC LIMIT 5000`
  );
  console.log(`找到 ${rows.length} 個 thread 要 embed`);
  if (rows.length === 0) return;

  const BATCH = 20;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const texts = batch.map((r) => {
      const plainContent = String(r.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
      return `${r.title}\n\n${plainContent}`;
    });
    try {
      const vecs = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) {
        await client.query(
          `UPDATE public.forum_threads SET embedding = $1, embedding_updated_at = NOW() WHERE id = $2`,
          [toVector(vecs[j]), batch[j].id],
        );
      }
      done += batch.length;
      console.log(`  ${done}/${rows.length}`);
    } catch (e) {
      console.warn(`  batch ${i} 失敗：${e.message}`);
    }
  }
  console.log(`✅ Forum 完成 ${done}/${rows.length}`);
}

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("📡 已連線 supabase");
try {
  if (RUN_LESSONS) await backfillLessons(client);
  if (RUN_FORUM) await backfillForum(client);
} finally {
  await client.end();
}
console.log("\n🎉 全部完成");
