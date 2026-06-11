// 全章節內容健檢：揪出可機器驗證的「寫錯/壞掉」。輸出分類報告、不改檔。
//   node scripts/_audit-content.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "src", "data", "chapters");
const PUBLIC = path.join(__dirname, "..", "public");

const files = fs.readdirSync(DIR).filter((f) => /^ch\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));

const findings = { json: [], fence: [], image: [], placeholder: [], dupId: [], arith: [], empty: [] };
const seenLessonIds = new Map(); // id -> "chNN/lessonNum"
const PLACEHOLDER_RE = /(撰寫中|稍後將補回|待補|待撰寫|TODO|FIXME|lorem ipsum|XXXX|占位|佔位文字|coming soon)/i;

// 安全整數算式求值（只允許數字與 + - * / // % ** ( )）
function safeIntEval(expr) {
  if (!/^[\d\s+\-*/%().]+$/.test(expr)) return null;
  if (!/[+\-*/%]/.test(expr)) return null;
  let js = expr.replace(/\/\//g, "##FLOOR##").replace(/\*\*/g, "**");
  // 還原 // 為 Math.floor 除法
  try {
    // 把 a ## FLOOR ## b 轉成 Math.floor(a/b) 僅支援簡單二元；過於複雜就跳過
    if (js.includes("##FLOOR##")) {
      const m = js.match(/^\s*(\d+)\s*##FLOOR##\s*(\d+)\s*$/);
      if (!m) return null;
      return Math.floor(parseInt(m[1]) / parseInt(m[2]));
    }
    // 限制：不允許單一 / 產生浮點被當整數比對（交給人看）
    if (/[^*]\/[^/]/.test(expr) && !/\*\*/.test(expr)) {
      // 含真除法、結果可能是小數、略過自動比對
      if (!Number.isInteger(eval(expr))) return null;
    }
    const v = eval(js);
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch { return null; }
}

for (const f of files) {
  const p = path.join(DIR, f);
  let j;
  try { j = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { findings.json.push(`${f}: ${e.message}`); continue; }
  const lessons = j.lessons || [];
  for (const l of lessons) {
    const tag = `${f}/${l.id}`;
    // 重複 lesson id
    if (seenLessonIds.has(l.id)) findings.dupId.push(`${l.id} 同時出現在 ${seenLessonIds.get(l.id)} 與 ${f}`);
    else seenLessonIds.set(l.id, f);

    const c = l.content || "";
    if (!c || c.trim().length < 40) { if (l.content !== undefined) findings.empty.push(`${tag} content 過短(${c.trim().length})`); continue; }

    // 不平衡 code fence
    const fences = (c.match(/```/g) || []).length;
    if (fences % 2 !== 0) findings.fence.push(`${tag} code fence 數量 ${fences}（奇數、code 區塊沒收尾）`);

    // placeholder
    if (PLACEHOLDER_RE.test(c)) findings.placeholder.push(`${tag} 含未完成標記`);

    // 圖片 broken ref
    for (const m of c.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      let src = m[1].trim();
      if (src.startsWith("http")) continue;
      const rel = src.replace(/^\//, "");
      if (!fs.existsSync(path.join(PUBLIC, rel))) findings.image.push(`${tag} 圖片不存在: ${src}`);
    }

    // 可疑算式：`<expr>  # <number>` 或 `print(<expr>)  # <number>`
    for (const line of c.split("\n")) {
      const mm = line.match(/(?:print\(\s*)?([\d\s+\-*/%().]{3,})\)?\s*#\s*(-?\d+)\b/);
      if (!mm) continue;
      const expr = mm[1].trim().replace(/\)$/, "");
      const claimed = parseInt(mm[2]);
      const real = safeIntEval(expr);
      if (real !== null && real !== claimed) findings.arith.push(`${tag}  「${expr}」 標 ${claimed} 但實際 = ${real}`);
    }
  }
}

const order = [
  ["json", "❌ JSON 解析失敗"],
  ["dupId", "❌ 重複的 lesson id"],
  ["fence", "❌ code fence 不平衡（會破版）"],
  ["image", "⚠️ 引用了不存在的圖片"],
  ["arith", "⚠️ 程式碼註解算式對不上（疑似寫錯）"],
  ["placeholder", "⚠️ 未完成標記"],
  ["empty", "ℹ️ content 過短/空"],
];
let total = 0;
for (const [k, label] of order) {
  const arr = findings[k];
  console.log(`\n=== ${label} — ${arr.length} 筆 ===`);
  arr.slice(0, 60).forEach((x) => console.log("  " + x));
  if (arr.length > 60) console.log(`  …還有 ${arr.length - 60} 筆`);
  total += arr.length;
}
console.log(`\n章節數 ${files.length}、lesson 數 ${seenLessonIds.size}、總問題 ${total}`);
