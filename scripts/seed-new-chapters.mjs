// 把新章節 JSON (ch72/ch73/ch74) upsert 到 prod DB
// 用法：node scripts/seed-new-chapters.mjs
//
// 為什麼這支獨立：
//   - 既有 71 章已在 DB、不要動
//   - 新章 有 sortIndex 欄、要設 chapters.sort_index
//   - 把 lessons 也 upsert (chapter_id + id 唯一)

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const NEW_CHAPTERS = ["ch72.json", "ch73.json", "ch74.json"];

function loadEnv() {
  const path = ".env.local";
  if (!existsSync(path)) {
    console.error("❌ .env.local 不存在");
    process.exit(1);
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
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
if (!DB_URL) { console.error("❌ SUPABASE_DB_URL not set"); process.exit(1); }

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();
console.log("📡 連到 DB\n");

let okCh = 0, okLesson = 0, failCh = 0, failLesson = 0;

for (const file of NEW_CHAPTERS) {
  const fpath = join("src", "data", "chapters", file);
  if (!existsSync(fpath)) {
    console.log(`⏭️  ${file} 不存在、跳過`);
    continue;
  }
  const ch = JSON.parse(readFileSync(fpath, "utf8"));
  process.stdout.write(`▶️  Ch${ch.id} ${ch.title} ...`);

  try {
    // 1. 寫 chapters 表
    await client.query(
      `INSERT INTO public.chapters
         (id, slug, stage, sort_index, title, subtitle, icon, description,
          status, difficulty, prerequisites, estimated_hours, outcomes, boss, summary, faq)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET
         slug = EXCLUDED.slug,
         stage = EXCLUDED.stage,
         sort_index = EXCLUDED.sort_index,
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         icon = EXCLUDED.icon,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         difficulty = EXCLUDED.difficulty,
         prerequisites = EXCLUDED.prerequisites,
         estimated_hours = EXCLUDED.estimated_hours,
         outcomes = EXCLUDED.outcomes,
         boss = EXCLUDED.boss,
         summary = EXCLUDED.summary,
         faq = EXCLUDED.faq,
         updated_at = NOW()`,
      [
        ch.id,
        ch.slug ?? null,
        String(ch.stage),
        ch.sortIndex ?? null,
        ch.title,
        ch.subtitle ?? null,
        ch.icon ?? null,
        ch.description ?? null,
        ch.status ?? "published",
        ch.difficulty ?? "beginner",
        ch.prerequisites ?? [],
        ch.estimatedHours ?? 0,
        JSON.stringify(ch.outcomes ?? []),
        ch.boss ? JSON.stringify(ch.boss) : null,
        JSON.stringify(ch.summary ?? []),
        JSON.stringify(ch.faq ?? []),
      ],
    );
    console.log(" ✅ chapter");
    okCh++;

    // 2. 寫 lessons 表
    for (let i = 0; i < (ch.lessons ?? []).length; i++) {
      const l = ch.lessons[i];
      try {
        await client.query(
          `INSERT INTO public.lessons
             (id, chapter_id, number, title, one_line_summary, analogy, content,
              outline, resource_groups, tip, exercise, playgrounds, mini_quiz, files, xp, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO UPDATE SET
             chapter_id = EXCLUDED.chapter_id,
             number = EXCLUDED.number,
             title = EXCLUDED.title,
             one_line_summary = EXCLUDED.one_line_summary,
             analogy = EXCLUDED.analogy,
             content = EXCLUDED.content,
             outline = EXCLUDED.outline,
             resource_groups = EXCLUDED.resource_groups,
             tip = EXCLUDED.tip,
             exercise = EXCLUDED.exercise,
             playgrounds = EXCLUDED.playgrounds,
             mini_quiz = EXCLUDED.mini_quiz,
             files = EXCLUDED.files,
             xp = EXCLUDED.xp,
             sort_order = EXCLUDED.sort_order,
             updated_at = NOW()`,
          [
            l.id,
            ch.id,
            l.number ?? `LESSON ${l.id}`,
            l.title,
            l.oneLineSummary ?? null,
            l.analogy ?? null,
            l.content ?? null,
            JSON.stringify(l.outline ?? []),
            l.resourceGroups ? JSON.stringify(l.resourceGroups) : null,
            l.tip ? JSON.stringify(l.tip) : null,
            l.exercise ? JSON.stringify(l.exercise) : null,
            JSON.stringify(l.playgrounds ?? []),
            l.miniQuiz ? JSON.stringify(l.miniQuiz) : null,
            l.files ? JSON.stringify(l.files) : null,
            l.xp ?? 10,
            i,
          ],
        );
        okLesson++;
      } catch (e) {
        console.log(`   ❌ lesson ${l.id}: ${e.message?.split("\n")[0]}`);
        failLesson++;
      }
    }
    console.log(`   📚 ${ch.lessons?.length ?? 0} lessons upsert`);
  } catch (e) {
    console.log(` ❌\n   ${e.message?.split("\n")[0]}`);
    failCh++;
  }
}

console.log(`\n📊 chapter ${okCh} 成功 / ${failCh} 失敗`);
console.log(`📊 lesson  ${okLesson} 成功 / ${failLesson} 失敗`);

await client.end();
process.exit(failCh + failLesson > 0 ? 1 : 0);
