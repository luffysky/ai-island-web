// 把 src/data/chapters/*.json 灌進 Supabase chapters + lessons 表。
// 重複跑安全（upsert）。匯入完才把 content.ts 切換成讀 DB。
//
// 用法：
//   node scripts/import_chapters_to_db.mjs
//
// 環境：需 .env.local 內有 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// 載 .env.local
dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHAPTERS_DIR = path.join(ROOT, "src/data/chapters");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ 缺 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const files = fs.readdirSync(CHAPTERS_DIR).filter((f) => f.endsWith(".json")).sort();
console.log(`📚 找到 ${files.length} 個 JSON 章節檔`);

let chapterOk = 0;
let lessonOk = 0;
let errors = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(CHAPTERS_DIR, file), "utf-8");
  const ch = JSON.parse(raw);

  const chapterRow = {
    id: ch.id,
    slug: ch.slug ?? null,
    stage: String(ch.stage),
    title: ch.title,
    subtitle: ch.subtitle ?? null,
    icon: ch.icon ?? null,
    description: ch.description ?? null,
    status: ch.status ?? "published",
    difficulty: ch.difficulty ?? "beginner",
    prerequisites: Array.isArray(ch.prerequisites) ? ch.prerequisites : [],
    estimated_hours: ch.estimatedHours ?? 0,
    outcomes: ch.outcomes ?? [],
    boss: ch.boss ?? null,
    summary: ch.summary ?? [],
    faq: ch.faq ?? [],
  };

  const { error: chErr } = await supabase
    .from("chapters")
    .upsert(chapterRow, { onConflict: "id" });
  if (chErr) {
    console.error(`  ❌ ch${ch.id} chapter:`, chErr.message);
    errors++;
    continue;
  }
  chapterOk++;

  // lessons：批次 upsert
  if (Array.isArray(ch.lessons) && ch.lessons.length > 0) {
    const lessonRows = ch.lessons.map((l, idx) => ({
      id: l.id,
      chapter_id: ch.id,
      number: l.number ?? `LESSON ${l.id}`,
      title: l.title,
      one_line_summary: l.oneLineSummary ?? null,
      analogy: l.analogy ?? null,
      content: l.content ?? null,
      outline: l.outline ?? [],
      resource_groups: l.resourceGroups ?? null,
      tip: l.tip ?? null,
      exercise: l.exercise ?? null,
      playgrounds: l.playgrounds ?? [],
      mini_quiz: l.miniQuiz ?? null,
      files: l.files ?? null,
      xp: l.xp ?? 10,
      sort_order: idx,
    }));
    const { error: lErr } = await supabase
      .from("lessons")
      .upsert(lessonRows, { onConflict: "id" });
    if (lErr) {
      console.error(`  ❌ ch${ch.id} lessons:`, lErr.message);
      errors++;
    } else {
      lessonOk += lessonRows.length;
    }
  }

  const lc = ch.lessons?.length ?? 0;
  console.log(`  ✅ ch${String(ch.id).padStart(2, "0")} · ${ch.title} (${lc} lessons)`);
}

console.log(`\n✨ 完成：${chapterOk} chapters / ${lessonOk} lessons / ${errors} errors`);
