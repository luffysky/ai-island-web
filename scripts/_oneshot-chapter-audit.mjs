/**
 * Audit 每章 lesson 缺什麼欄位（給新手友善化補強用）
 * 標準：oneLineSummary, analogy, tip, exercise, content 字數
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "src/data/chapters";
const files = readdirSync(dir).filter((f) => /^ch\d+\.json$/.test(f)).sort();

const summary = [];
for (const f of files) {
  const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const lessons = raw.lessons ?? [];
  let missingOne = 0, missingAnalogy = 0, missingTip = 0, missingExercise = 0;
  let thinContent = 0, totalChars = 0;
  for (const l of lessons) {
    if (!l.oneLineSummary || l.oneLineSummary.trim().length < 10) missingOne++;
    if (!l.analogy || l.analogy.trim().length < 10) missingAnalogy++;
    if (!l.tip) missingTip++;
    if (!l.exercise) missingExercise++;
    const c = (l.content ?? "").length;
    totalChars += c;
    if (c < 800) thinContent++;
  }
  summary.push({
    id: raw.id,
    stage: raw.stage,
    title: raw.title,
    lessons: lessons.length,
    missingOne,
    missingAnalogy,
    missingTip,
    missingExercise,
    thinContent,
    avgContent: lessons.length ? Math.round(totalChars / lessons.length) : 0,
    needsRework: missingOne + missingAnalogy >= lessons.length * 0.4 || thinContent >= lessons.length * 0.4,
  });
}

summary.sort((a, b) => Number(a.id) - Number(b.id));

console.log(`Audit ${files.length} chapters\n`);
console.log("Ch  Stage  缺一句  缺類比  缺tip  缺練習  薄內容  平均字數  Lessons  Rework?  Title");
console.log("─".repeat(110));
for (const s of summary) {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(
    pad("Ch" + String(s.id).padStart(2, "0"), 5),
    pad(s.stage, 5),
    pad(s.missingOne, 7),
    pad(s.missingAnalogy, 7),
    pad(s.missingTip, 6),
    pad(s.missingExercise, 7),
    pad(s.thinContent, 7),
    pad(s.avgContent, 9),
    pad(s.lessons, 8),
    pad(s.needsRework ? "🔴 YES" : "✅", 9),
    s.title,
  );
}

const needRework = summary.filter((s) => s.needsRework);
console.log(`\n需要 rework：${needRework.length} 章 / 共 ${needRework.reduce((a, b) => a + b.lessons, 0)} lesson`);
console.log("Chapters:", needRework.map((s) => s.id).join(", "));
