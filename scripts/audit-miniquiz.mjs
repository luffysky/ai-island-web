// miniQuiz 結構抽查（自動化「AI 草稿抽查」的一半：先把「機器查得出的錯」全揪出來、
// 人工只需focus在「答案對不對」這種需要懂內容的部分）。
//   node scripts/audit-miniquiz.mjs            # 全部章
//   node scripts/audit-miniquiz.mjs ch26 ch79  # 指定章
//
// 檢查項：題目空白 / 選項<2 / 選項 value 或 label 空 / 答案不在選項裡 /
//         value 重複 / label 重複（疑似貼錯）/ 沒解析。
import fs from "fs";
import path from "path";

const DIR = "src/data/chapters";
const only = process.argv.slice(2);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json") && (only.length === 0 || only.some((o) => f.startsWith(o))));

let problems = 0, warned = 0, checked = 0;

function checkQuiz(chId, lessonId, q, idx) {
  const where = `${chId} · ${lessonId}${idx != null ? ` #${idx}` : ""}`;
  const errs = [], warns = [];
  if (!q || typeof q !== "object") { console.log(`❌ ${where}：miniQuiz 不是物件`); problems++; return; }
  checked++;
  if (!q.question || !String(q.question).trim()) errs.push("題目空白");
  const opts = Array.isArray(q.options) ? q.options : [];
  if (opts.length < 2) errs.push(`選項只有 ${opts.length} 個`);
  const values = opts.map((o) => (o && typeof o === "object" ? o.value : o));
  const labels = opts.map((o) => (o && typeof o === "object" ? o.label : o));
  opts.forEach((o, i) => {
    const v = o && typeof o === "object" ? o.value : o;
    const l = o && typeof o === "object" ? o.label : o;
    if (v == null || String(v).trim() === "") errs.push(`選項#${i} value 空`);
    if (l == null || String(l).trim() === "") errs.push(`選項#${i} label 空`);
  });
  if (new Set(values).size !== values.length) errs.push("選項 value 重複");
  if (new Set(labels.map((x) => String(x).trim())).size !== labels.length) warns.push("選項 label 重複（疑似貼錯）");
  if (q.answer == null || String(q.answer).trim() === "") errs.push("沒答案");
  else if (!values.map(String).includes(String(q.answer))) errs.push(`答案「${q.answer}」不在選項裡（${values.join("/")}）`);
  if (!q.explanation || !String(q.explanation).trim()) warns.push("沒解析");

  if (errs.length) { console.log(`❌ ${where}：${errs.join("；")}`); problems++; }
  if (warns.length) { console.log(`⚠️  ${where}：${warns.join("；")}`); warned++; }
}

for (const f of files) {
  const ch = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  const chId = ch.id ?? f.replace(".json", "");
  for (const l of ch.lessons ?? []) {
    if (l.miniQuiz) checkQuiz(chId, l.id, l.miniQuiz);
    if (Array.isArray(l.miniQuizzes)) l.miniQuizzes.forEach((q, i) => checkQuiz(chId, l.id, q, i));
  }
}

console.log(`\n📊 檢查 ${checked} 題：❌ ${problems} 個錯、⚠️ ${warned} 個提醒。`);
process.exit(problems > 0 ? 1 : 0);
