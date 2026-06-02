#!/usr/bin/env node
// 產生 src/data/chapters-lite.json —— 只含 {id, stage, lessonIds}，
// 給 client component（SkillRadar / CareerProgress）用，避免 import 整包 8.7MB 章節內容進 client bundle。
// 章節結構有變動時重跑：node scripts/gen-chapters-lite.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "src", "data", "chapters");
const files = fs.readdirSync(dir).filter((f) => /^ch\d+\.json$/.test(f)).sort();

const out = [];
for (const f of files) {
  const ch = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  out.push({
    id: ch.id,
    stage: ch.stage,
    lessonIds: Array.isArray(ch.lessons) ? ch.lessons.map((l) => l.id) : [],
  });
}
out.sort((a, b) => a.id - b.id);

const dest = path.join(__dirname, "..", "src", "data", "chapters-lite.json");
fs.writeFileSync(dest, JSON.stringify(out) + "\n");
const totalLessons = out.reduce((s, c) => s + c.lessonIds.length, 0);
console.log(`wrote ${dest} — ${out.length} chapters, ${totalLessons} lessons`);
