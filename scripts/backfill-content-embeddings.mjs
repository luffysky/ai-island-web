/**
 * 全站語意搜尋 backfill — 把公開內容 embed 進 content_embeddings 表
 *
 * 來源（content_type）：
 *   chapter       ← chapters 表（title + subtitle + description + 其 lessons 的標題/摘要串一起）
 *   dungeon       ← src/data/dungeons.ts（靜態 5 大副本）
 *   blog          ← user_blog_articles（is_public=true 且該用戶 blog is_enabled）
 *   forum_thread  ← forum_threads（未鎖）
 *
 * 特性：
 *   - Resumable：預設只 embed 「content_embeddings 裡還沒有」的內容（--force 才重算）
 *   - Rate-limited：每批之間 sleep，避免打爆 OpenAI
 *   - upsert：ON CONFLICT (content_type, content_id) DO UPDATE
 *
 * 用法：
 *   node scripts/backfill-content-embeddings.mjs --limit 50          # 只 embed 50 筆（demo / 驗證）
 *   node scripts/backfill-content-embeddings.mjs                     # 全部（未 embed 的）→ 會花 $，量大時才跑
 *   node scripts/backfill-content-embeddings.mjs --only chapter,blog # 只跑某些來源
 *   node scripts/backfill-content-embeddings.mjs --force             # 重算全部（含已存在）
 *
 * 依賴 .env.local：SUPABASE_DB_URL + OPENAI_API_KEY（或 OPENAI_API_KEY_RAW）
 *
 * 成本：text-embedding-3-small ≈ $0.00002 / 1K tokens、單筆約 ~500 token → 1000 筆 ≈ $0.01
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

// ---------- env ----------
function loadEnv() {
  if (!existsSync(".env.local")) {
    console.error("[x] .env.local 不存在");
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
if (!DB_URL) { console.error("[x] SUPABASE_DB_URL not set"); process.exit(1); }

// OpenAI key：優先用 raw env（一次性 backfill 方便）；沒有就跟線上一樣、
// 從 ai_api_keys 表 decrypt（AES-256-GCM、key = sha256(AI_KEY_SECRET)、格式 iv:tag:data base64）
let OPENAI_KEY = env.OPENAI_API_KEY_RAW || env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";

function decryptKey(encrypted, secret) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const [ivB64, tagB64, dataB64] = encrypted.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted key format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

async function resolveOpenAIKey(client) {
  if (OPENAI_KEY) return OPENAI_KEY;
  const secret = env.AI_KEY_SECRET || process.env.AI_KEY_SECRET;
  if (!secret) throw new Error("沒有 OPENAI_API_KEY、也沒有 AI_KEY_SECRET 可解 ai_api_keys");
  const { rows } = await client.query(
    `SELECT api_key_encrypted, enabled FROM public.ai_api_keys WHERE provider = 'openai' LIMIT 1`
  );
  if (!rows[0] || !rows[0].enabled) throw new Error("ai_api_keys 沒有啟用的 openai key");
  OPENAI_KEY = decryptKey(rows[0].api_key_encrypted, secret);
  console.log("[*] 已從 ai_api_keys decrypt OpenAI key");
  return OPENAI_KEY;
}

// ---------- args ----------
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
function argVal(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const LIMIT = argVal("--limit") ? Math.max(1, parseInt(argVal("--limit"), 10)) : Infinity;
const onlyArg = argVal("--only");
const ONLY = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;
const wants = (type) => !ONLY || ONLY.has(type);

const SITE_URL = (env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet").replace(/\/+$/, "");
const EMBED_MODEL = "text-embedding-3-small";
const BATCH = 20;
const SLEEP_MS = 350; // 每批之間 rate-limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const toVector = (arr) => `[${arr.join(",")}]`;

async function embedBatch(texts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts, dimensions: 1536 }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return (await res.json()).data.map((d) => d.embedding);
  } finally {
    clearTimeout(t);
  }
}

// ---------- 各來源：回傳 candidate {content_type, content_id, title, snippet, url, meta, text} ----------
async function collectChapters(client) {
  const { rows: chs } = await client.query(
    `SELECT id, title, subtitle, description FROM public.chapters ORDER BY sort_index NULLS LAST, id`
  );
  // 一次撈全 lessons（含 chapter_id）→ 分組併進章節 doc（分頁避免 1000 截斷）
  const lessonsByCh = new Map();
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { rows } = await client.query(
      `SELECT chapter_id, title, one_line_summary FROM public.lessons ORDER BY chapter_id, sort_order OFFSET $1 LIMIT $2`,
      [from, PAGE]
    );
    for (const l of rows) {
      if (!lessonsByCh.has(l.chapter_id)) lessonsByCh.set(l.chapter_id, []);
      lessonsByCh.get(l.chapter_id).push(l);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return chs.map((c) => {
    const lessons = lessonsByCh.get(c.id) || [];
    const lessonText = lessons
      .map((l) => `- ${clean(l.title)}${l.one_line_summary ? "：" + clean(l.one_line_summary) : ""}`)
      .join("\n")
      .slice(0, 4000);
    const snippet = clean(c.subtitle || c.description || lessons[0]?.one_line_summary || "").slice(0, 200);
    const text = [
      `第 ${c.id} 章：${clean(c.title)}`,
      clean(c.subtitle),
      clean(c.description),
      lessonText,
    ].filter(Boolean).join("\n");
    return {
      content_type: "chapter",
      content_id: String(c.id),
      title: c.title,
      snippet,
      url: `${SITE_URL}/chapters/${c.id}`,
      meta: { lesson_count: lessons.length },
      text,
    };
  });
}

async function collectDungeons() {
  // dungeons.ts 是純 TS（只有 type-only 宣告、無 runtime import）→ 剝掉型別後動態 import
  const file = path.join(process.cwd(), "src/data/dungeons.ts");
  if (!existsSync(file)) return [];
  try {
    let src = readFileSync(file, "utf8");
    src = src
      // 移除 top-level interface 區塊（收尾 } 在第 0 欄、才不會被巢狀 } 提早截斷）
      .replace(/^export\s+interface\s+\w+[\s\S]*?^\}/gm, "")
      // 移除 top-level 帶型別的 helper function（如 getDungeon(slug: string): Dungeon）
      .replace(/^export\s+function\s+[\s\S]*?^\}/gm, "")
      .replace(/:\s*Dungeon\[\]/g, "");                          // 移除 const 型別註記
    const dataUrl = "data:text/javascript;base64," + Buffer.from(src, "utf8").toString("base64");
    const mod = await import(dataUrl);
    const list = mod.DUNGEONS || [];
    return list.map((d) => ({
      content_type: "dungeon",
      content_id: d.slug,
      title: `${d.name}｜${d.subtitle || ""}`.trim(),
      snippet: clean(d.tagline || d.intro).slice(0, 200),
      url: `${SITE_URL}/courses/${d.slug}`,
      meta: { no: d.no },
      text: [d.name, d.subtitle, d.tagline, clean(d.intro), (d.outcomes || []).join("、"), (d.modules || []).map((m) => m.title).join("、")]
        .filter(Boolean).join("\n").slice(0, 4000),
    }));
  } catch (e) {
    console.warn("[!] 讀 dungeons.ts 失敗、跳過副本：", e.message);
    return [];
  }
}

async function collectBlog(client) {
  const { rows } = await client.query(
    `SELECT a.id, a.title, a.summary, a.slug, a.content, a.tags, a.user_id,
            COALESCE(s.blog_slug, a.user_id::text) AS user_slug
       FROM public.user_blog_articles a
       JOIN public.user_blog_settings s ON s.user_id = a.user_id AND s.is_enabled = true
      WHERE a.is_public = true
      ORDER BY a.published_at DESC
      LIMIT 5000`
  );
  return rows.map((a) => ({
    content_type: "blog",
    content_id: String(a.id),
    title: a.title,
    snippet: clean(a.summary || a.content).slice(0, 200),
    url: `${SITE_URL}/blogs/${a.user_slug}/${a.slug}`,
    meta: { tags: a.tags || [] },
    text: [a.title, clean(a.summary), clean(a.content).slice(0, 4000)].filter(Boolean).join("\n"),
  }));
}

async function collectForum(client) {
  const { rows } = await client.query(
    `SELECT id, title, content FROM public.forum_threads
      WHERE (is_locked IS NULL OR is_locked = false)
      ORDER BY created_at DESC LIMIT 5000`
  );
  return rows.map((t) => ({
    content_type: "forum_thread",
    content_id: String(t.id),
    title: t.title,
    snippet: clean(t.content).slice(0, 200),
    url: `${SITE_URL}/forum/thread/${t.id}`,
    meta: {},
    text: [t.title, clean(t.content).slice(0, 4000)].filter(Boolean).join("\n"),
  }));
}

// ---------- main ----------
const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("[*] 已連線 Supabase");

try {
  // 0. 確保有 OpenAI key（raw env 或 decrypt ai_api_keys）
  await resolveOpenAIKey(client);

  // 1. 收集候選
  let candidates = [];
  if (wants("chapter")) candidates.push(...await collectChapters(client));
  if (wants("dungeon")) candidates.push(...await collectDungeons());
  if (wants("blog")) candidates.push(...await collectBlog(client));
  if (wants("forum_thread")) candidates.push(...await collectForum(client));
  candidates = candidates.filter((c) => c.text && c.text.length > 0);
  console.log(`[*] 收集到 ${candidates.length} 筆候選內容`);

  // 2. Resumable：撈已存在的 (content_type, content_id)
  if (!FORCE) {
    const { rows: existing } = await client.query(
      `SELECT content_type, content_id FROM public.content_embeddings`
    );
    const have = new Set(existing.map((e) => `${e.content_type}::${e.content_id}`));
    const before = candidates.length;
    candidates = candidates.filter((c) => !have.has(`${c.content_type}::${c.content_id}`));
    console.log(`[*] 已 embed ${have.size} 筆、跳過；剩 ${candidates.length}/${before} 待 embed（--force 可重算）`);
  }

  // 3. 套用 limit
  if (candidates.length > LIMIT) {
    console.log(`[*] --limit ${LIMIT}：本次只處理前 ${LIMIT} 筆`);
    candidates = candidates.slice(0, LIMIT);
  }
  if (candidates.length === 0) {
    console.log("[✓] 沒有要 embed 的內容、結束");
  }

  // 4. 分批 embed + upsert
  let done = 0, failed = 0;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    try {
      const vecs = await embedBatch(batch.map((b) => b.text.slice(0, 8000)));
      for (let j = 0; j < batch.length; j++) {
        const b = batch[j];
        await client.query(
          `INSERT INTO public.content_embeddings
             (content_type, content_id, title, snippet, url, embedding, meta, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())
           ON CONFLICT (content_type, content_id) DO UPDATE
             SET title = EXCLUDED.title, snippet = EXCLUDED.snippet, url = EXCLUDED.url,
                 embedding = EXCLUDED.embedding, meta = EXCLUDED.meta, updated_at = NOW()`,
          [b.content_type, b.content_id, b.title, b.snippet, b.url, toVector(vecs[j]), b.meta]
        );
      }
      done += batch.length;
      const types = {};
      for (const b of batch) types[b.content_type] = (types[b.content_type] || 0) + 1;
      console.log(`  [${done}/${candidates.length}] +${batch.length} (${Object.entries(types).map(([k, v]) => `${k}:${v}`).join(" ")})`);
    } catch (e) {
      failed += batch.length;
      console.warn(`  batch @${i} 失敗：${e.message}`);
    }
    if (i + BATCH < candidates.length) await sleep(SLEEP_MS);
  }

  const { rows: [{ count }] } = await client.query(`SELECT COUNT(*)::int AS count FROM public.content_embeddings`);
  console.log(`\n[✓] 完成：本次 embed ${done} 筆${failed ? `、失敗 ${failed}` : ""}。content_embeddings 現有 ${count} 筆。`);
} finally {
  await client.end();
}
