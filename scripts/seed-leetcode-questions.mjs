/**
 * 灌 leetcode_questions（每日測驗的 leetcode 半邊題庫）
 *
 * 背景：daily quiz 的 leetcode 題抽自 `leetcode_questions`（含 options/answer/解析/ELO rating），
 * 但這張表一直空的 → 每日測驗只剩 ≤15 題章節 miniQuiz、看起來「題目沒變」。
 * 這支腳本從 `leetcode_problems` 目錄（3944 筆、只有標題/難度）挑題、用系統 AI key
 * 生成「繁中、概念導向」的單選題、灌進 leetcode_questions。
 *
 * ⚠️ 會呼叫 AI、花錢。先用小 --limit 試跑、確認品質再放大。可重複跑（自動跳過已生成的 slug）。
 *
 * 用法：
 *   node scripts/seed-leetcode-questions.mjs --limit 20
 *   node scripts/seed-leetcode-questions.mjs --limit 50 --difficulty easy
 *   node scripts/seed-leetcode-questions.mjs --limit 5 --dry        # 只看產出、不寫 DB
 *
 * 需要 .env.local：SUPABASE_DB_URL、AI_KEY_SECRET（跟站上加密 AI key 用的同一把）
 */
import pg from "pg";
import { loadEnv, loadProviderKey, pickModelName } from "./_lib/ai-crypto.mjs";

// ---- args ----
const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const LIMIT = Number(arg("limit", 20));
const DIFFICULTY = arg("difficulty", "all"); // easy | medium | hard | all
const DRY = !!arg("dry", false);

const RATING_BY_DIFF = { easy: 1000, medium: 1200, hard: 1450 };

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
const model = await pickModelName(c, "anthropic");
console.log(`🤖 model=${model}  limit=${LIMIT}  difficulty=${DIFFICULTY}  dry=${DRY}`);

// 挑還沒生成過的題（slug 不在 leetcode_questions）
const diffFilter = DIFFICULTY === "all" ? "" : `AND p.difficulty = '${DIFFICULTY}'`;
const { rows: problems } = await c.query(`
  SELECT p.slug, p.number, p.title, p.difficulty, p.tags
  FROM leetcode_problems p
  WHERE p.active = true
    AND NOT p.is_premium
    ${diffFilter}
    AND NOT EXISTS (SELECT 1 FROM leetcode_questions q WHERE q.slug = p.slug)
  ORDER BY p.number
  LIMIT ${LIMIT}
`);
console.log(`📋 待生成 ${problems.length} 題\n`);

const SYSTEM = `你是 AI 島的出題老師。我會給你一道 LeetCode 題目的標題與難度，請你出「一題」繁體中文的『概念理解單選題』。

要求：
1. 全程繁體中文。考的是這題背後的「核心觀念 / 最佳解法思路 / 時間複雜度」，不是要使用者真的把 code 寫出來。
2. 對新手友善：題幹用人話、白話解釋情境，可加一句生活比喻。
3. 四個選項、value 固定用 "a" "b" "c" "d"，只有一個正確；錯的選項要像真的會有人選（不要明顯廢答）。
4. 只回傳「純 JSON」，外面不要任何 markdown code fence、不要多餘文字。
5. JSON 結構嚴格如下：
{
  "body_md": "題幹（可用 markdown、可換行）",
  "options": [
    { "value": "a", "label": "選項文字" },
    { "value": "b", "label": "選項文字" },
    { "value": "c", "label": "選項文字" },
    { "value": "d", "label": "選項文字" }
  ],
  "answer": "a",
  "explanation": "為什麼這個答案對、其他為什麼錯（1-3 句）"
}`;

async function genOne(p) {
  const userMsg = `LeetCode 題目：#${p.number ?? "?"} ${p.title}\n難度：${p.difficulty}\n標籤：${(p.tags ?? []).join(", ") || "（無）"}\n\n請依以上出一題概念單選題、回傳純 JSON。`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) {
    throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  let raw = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first > 0) raw = raw.slice(first);
  if (last >= 0 && last < raw.length - 1) raw = raw.slice(0, raw.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}

function valid(q) {
  return (
    q &&
    typeof q.body_md === "string" &&
    Array.isArray(q.options) &&
    q.options.length >= 3 &&
    q.options.every((o) => o && typeof o.value === "string" && typeof o.label === "string") &&
    typeof q.answer === "string" &&
    q.options.some((o) => o.value === q.answer)
  );
}

let ok = 0;
let fail = 0;
for (const p of problems) {
  try {
    const q = await genOne(p);
    if (!valid(q)) {
      console.log(`  ⚠️ ${p.slug}: AI 回傳格式不對、跳過`);
      fail++;
      continue;
    }
    if (DRY) {
      console.log(`  🔎 ${p.slug} [${p.difficulty}] ans=${q.answer}\n     ${q.body_md.slice(0, 80).replace(/\n/g, " ")}...`);
      ok++;
      continue;
    }
    await c.query(
      `INSERT INTO leetcode_questions (slug, number, title, difficulty, tags, body_md, options, answer, explanation, language, rating, attempts, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'python',$10,0,true)
       ON CONFLICT (slug) DO NOTHING`,
      [
        p.slug,
        p.number ?? null,
        p.title,
        p.difficulty,
        p.tags ?? [],
        q.body_md,
        JSON.stringify(q.options),
        q.answer,
        q.explanation ?? null,
        RATING_BY_DIFF[p.difficulty] ?? 1200,
      ],
    );
    ok++;
    console.log(`  ✅ ${p.slug} [${p.difficulty}]`);
  } catch (e) {
    fail++;
    console.log(`  ❌ ${p.slug}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 400)); // 輕微節流、別撞 rate limit
}

const { rows: cnt } = await c.query(`SELECT count(*)::int n FROM leetcode_questions WHERE active=true`);
console.log(`\n完成：成功 ${ok}、失敗/跳過 ${fail}。leetcode_questions 現有 ${cnt[0].n} 題。`);
await c.end();
