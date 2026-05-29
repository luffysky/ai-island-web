/**
 * 用 AI（雪鑰）把 external_resources 自動綁定到最適合的章節
 * 一條 resource 一條 chapter；不適合的就保持 chapter_id = NULL（全站通用）
 *
 * 跑法：node scripts/_oneshot-link-resources-to-chapters.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import crypto from "crypto";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

// 拿 anthropic key
function decryptKey(encrypted, secret) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const [iv, tag, data] = encrypted.split(":").map((s) => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}
const keyRow = await c.query(`SELECT api_key_encrypted FROM ai_api_keys WHERE provider = 'anthropic' AND enabled = true`);
if (keyRow.rowCount === 0) { console.error("❌ anthropic key 沒設"); await c.end(); process.exit(1); }
const apiKey = decryptKey(keyRow.rows[0].api_key_encrypted, env.AI_KEY_SECRET);

// 拿 model name
const modelRow = await c.query(`SELECT model_name FROM ai_usage_models WHERE usage_key = 'admin_assistant' AND enabled = true LIMIT 1`);
const modelName = modelRow.rows[0]?.model_name ?? "claude-haiku-4-5-20251001";

// 撈所有 chapters
const chapters = await c.query(`SELECT id, title, subtitle FROM chapters WHERE status = 'published' ORDER BY id`);
console.log(`📚 ${chapters.rowCount} 章節`);

// 撈所有沒綁章節的 resource
const resources = await c.query(`
  SELECT id, title, short_desc, type, topics, tags
    FROM external_resources
   WHERE active = true AND chapter_id IS NULL
`);
console.log(`📦 ${resources.rowCount} 條 resource 未綁`);

const chapterListText = chapters.rows.map((ch) => `- [${ch.id}] ${ch.title}${ch.subtitle ? ` (${ch.subtitle})` : ""}`).join("\n");

let updated = 0;
for (const r of resources.rows) {
  console.log(`\n🔍 ${r.title}`);

  const prompt = `這個外部資源該綁哪個章節？

# 章節列表
${chapterListText}

# 資源
- 標題: ${r.title}
- 描述: ${r.short_desc}
- 類型: ${r.type}
- topics: ${(r.topics ?? []).join(", ")}
- tags: ${(r.tags ?? []).join(", ")}

# 任務
從章節列表選「最合適的 1 個 chapter_id」、或回 null（資源太通用、不適合綁特定章）。

# 輸出（嚴格 JSON、無 markdown）
{ "chapter_id": 數字 或 null, "reason": "20 字內理由" }`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: modelName, max_tokens: 150, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) { console.warn(`  ❌ ${res.status}`); continue; }
    const data = await res.json();
    const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) { console.warn(`  ❌ no JSON`); continue; }
    const parsed = JSON.parse(m[0]);
    const cid = parsed.chapter_id;
    if (cid === null || cid === undefined) {
      console.log(`  ➝ 通用、不綁章（${parsed.reason}）`);
      continue;
    }
    const chapter = chapters.rows.find((ch) => ch.id === Number(cid));
    if (!chapter) { console.warn(`  ❌ invalid chapter_id ${cid}`); continue; }

    await c.query(`UPDATE external_resources SET chapter_id = $1 WHERE id = $2`, [Number(cid), r.id]);
    updated++;
    console.log(`  ✓ → ch${cid} ${chapter.title}（${parsed.reason}）`);

    // 客氣 200ms
    await new Promise((r) => setTimeout(r, 200));
  } catch (e) {
    console.warn(`  ❌ ${e.message}`);
  }
}

const stats = await c.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(chapter_id) AS linked,
    COUNT(*) FILTER (WHERE chapter_id IS NULL) AS unlinked
  FROM external_resources WHERE active = true
`);
console.log(`\n✨ 完成 — ${stats.rows[0].total} 條：${stats.rows[0].linked} 綁章節 / ${stats.rows[0].unlinked} 通用`);
console.log(`本次新綁 ${updated} 條`);

await c.end();
