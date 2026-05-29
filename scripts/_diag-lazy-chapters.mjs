// 列出所有章節「偷懶」指標、找出最該重寫的 TOP N
// 靜態檢查 src/data/chapters/*.json、不用 AI
//
// 評分規則（每 lesson 滿分 10、分數越低越偷懶）：
//   -2: content < 500 字（內容太短）
//   -1: content < 1000 字（內容偏短）
//   -1: 沒 oneLineSummary（沒一句話摘要）
//   -1: 沒 analogy（沒類比）
//   -1: 沒 playgrounds（沒實作範例）
//   -1: 沒 tipBlocks / 沒 tip（沒提醒）
//   -1: 沒 miniQuiz（沒練習）
//   -1: 沒 jargonMap（沒英文 jargon 翻譯）
//
// 章節分數 = lesson 平均分

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/data/chapters";
const files = readdirSync(DIR).filter((f) => /^ch\d+\.json$/.test(f)).sort();

const scores = [];

for (const file of files) {
  const data = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  const id = data.id;
  const title = data.title || data.subtitle || "(無標題)";
  const lessons = data.lessons || [];
  if (lessons.length === 0) {
    scores.push({ id, title, lessonCount: 0, avgScore: 0, issues: ["0 lessons"] });
    continue;
  }

  let total = 0;
  const issuesAgg = {};
  for (const l of lessons) {
    let s = 10;
    const content = String(l.content ?? "");
    const len = content.length;
    if (len < 500) { s -= 2; issuesAgg.tooShort = (issuesAgg.tooShort ?? 0) + 1; }
    else if (len < 1000) { s -= 1; issuesAgg.short = (issuesAgg.short ?? 0) + 1; }
    if (!l.oneLineSummary) { s -= 1; issuesAgg.noSummary = (issuesAgg.noSummary ?? 0) + 1; }
    if (!l.analogy) { s -= 1; issuesAgg.noAnalogy = (issuesAgg.noAnalogy ?? 0) + 1; }
    if (!Array.isArray(l.playgrounds) || l.playgrounds.length === 0) { s -= 1; issuesAgg.noPlayground = (issuesAgg.noPlayground ?? 0) + 1; }
    if (!l.tipBlocks && !l.tip) { s -= 1; issuesAgg.noTip = (issuesAgg.noTip ?? 0) + 1; }
    if (!l.miniQuiz && !l.quiz) { s -= 1; issuesAgg.noQuiz = (issuesAgg.noQuiz ?? 0) + 1; }
    if (!l.jargonMap && !l.jargon) { s -= 1; issuesAgg.noJargon = (issuesAgg.noJargon ?? 0) + 1; }
    total += Math.max(0, s);
  }
  const avg = total / lessons.length;

  // 把 issues map 轉成可讀文字
  const issues = [];
  if (issuesAgg.tooShort) issues.push(`${issuesAgg.tooShort} 課太短`);
  if (issuesAgg.short) issues.push(`${issuesAgg.short} 課偏短`);
  if (issuesAgg.noSummary) issues.push(`${issuesAgg.noSummary} 課缺摘要`);
  if (issuesAgg.noAnalogy) issues.push(`${issuesAgg.noAnalogy} 課缺類比`);
  if (issuesAgg.noPlayground) issues.push(`${issuesAgg.noPlayground} 課缺範例`);
  if (issuesAgg.noTip) issues.push(`${issuesAgg.noTip} 課缺 tip`);
  if (issuesAgg.noQuiz) issues.push(`${issuesAgg.noQuiz} 課缺練習`);
  if (issuesAgg.noJargon) issues.push(`${issuesAgg.noJargon} 課缺 jargon`);

  scores.push({ id, title, lessonCount: lessons.length, avgScore: avg, issues });
}

scores.sort((a, b) => a.avgScore - b.avgScore);

console.log("\n📊 章節偷懶 TOP 15（分數越低越該重寫）\n");
console.log("Ch  | 分數 | lessons | 標題");
console.log("----+------+---------+" + "-".repeat(50));

const top = scores.slice(0, 15);
for (const s of top) {
  const id = String(s.id).padStart(2, "0");
  const score = s.avgScore.toFixed(1).padStart(4);
  const lc = String(s.lessonCount).padStart(3);
  console.log(`Ch${id} | ${score} | ${lc} 課  | ${s.title}`);
  if (s.issues.length > 0) {
    console.log(`     │      │         │ 問題：${s.issues.join("、")}`);
  }
}

// 健康章節（>= 8 分、新手友善化完成）
const healthy = scores.filter((s) => s.avgScore >= 8);
console.log(`\n✅ 健康章節（≥ 8 分）：${healthy.length} / ${scores.length}`);
console.log(`⚠️  該補章節（< 6 分）：${scores.filter((s) => s.avgScore < 6).length}`);
console.log(`🔴 嚴重偷懶（< 3 分）：${scores.filter((s) => s.avgScore < 3).length}`);
