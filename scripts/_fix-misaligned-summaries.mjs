// 偵測 + 修「oneLineSummary 與課程主題錯位」的全站 bug。
// 原理：summary 的 3-gram 若跟「同章另一課的內文」更像、就是被放錯位置 → 用本課內文重新萃取。
// 正確的（summary 最像自己內文）完全不動。
// usage: node scripts/_fix-misaligned-summaries.mjs           (dry-run)
//        node scripts/_fix-misaligned-summaries.mjs --apply
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const dir = "src/data/chapters";
const files = fs.readdirSync(dir).filter((f) => /^ch\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));

const CJK = /[一-鿿]/;
function grams(s) {
  s = (s || "").replace(/[\s*`#>\-—／/、，。：:（）()「」【】\[\]｜|]/g, "");
  const g = new Set();
  for (let i = 0; i < s.length - 2; i++) {
    const t = s.slice(i, i + 3);
    if (CJK.test(t)) g.add(t);
  }
  return g;
}
function overlap(a, bGrams) {
  let n = 0;
  for (const x of a) if (bGrams.has(x)) n++;
  return n;
}
// 從內文萃取一句白話 summary
function cleanLine(l) {
  return l.trim().replace(/\*\*/g, "").replace(/^[>#\-\s]+/, "").replace(/`/g, "");
}
function isHook(t) {
  // 跳過鉤子句 / 問句（不是好總結）
  return /[？?]/.test(t.slice(0, 40)) || /^(為什麼|你(按|想|還記得|第一次)|第一次|想像|還記得|先講為什麼|先理解)/.test(t);
}
function cjkCount(t) { return (t.match(/[一-鿿]/g) || []).length; }
function isUsable(t) {
  if (t.length < 12) return false;
  if (/^```/.test(t) || /^###/.test(t) || /^[#>`*\-\s]+$/.test(t)) return false;
  if (/^(📄|🖥️|⌨️|💬|☕|🚀|💼|🎯|⚡|━|>|💡|⚠️)/.test(t)) return false;
  if (t.includes("//")) return false;            // 程式碼註解
  if (/^[\x00-\x7F\s↑→←↓│└├]+$/.test(t)) return false; // 純 ASCII / ASCII art
  if (cjkCount(t) < 8) return false;             // 中文太少（多半是 code / 標註）
  return true;
}
function trim1(s) {
  const dot = s.search(/[。！]/);
  if (dot >= 12 && dot < 120) return s.slice(0, dot + 1);
  return s.length > 115 ? s.slice(0, 113) + "…" : s;
}
function derive(content) {
  const lines = (content || "").split(/\n/).map(cleanLine).filter(isUsable);
  // 優先：定義句（X 是… / X = … / X（中）…）且非鉤子
  const def = lines.find((t) => !isHook(t) && /^.{2,24}(是|＝|=|：|——|—|（)/.test(t));
  if (def) return trim1(def);
  // 次選：第一條非鉤子句
  const nonHook = lines.find((t) => !isHook(t));
  if (nonHook) return trim1(nonHook);
  return lines[0] ? trim1(lines[0]) : "";
}

let totalFixed = 0;
const samples = [];
const perCh = {};

for (const f of files) {
  const path = `${dir}/${f}`;
  const d = JSON.parse(fs.readFileSync(path, "utf-8"));
  const Ls = (d.lessons || []).filter((L) => L.oneLineSummary && L.content);
  if (Ls.length < 2) continue;
  const contentGrams = Ls.map((L) => grams(L.content.slice(0, 800)));
  let changed = false;
  Ls.forEach((L, i) => {
    const sg = grams(L.oneLineSummary);
    if (sg.size < 4) return; // 太短的白話總結不判（避免誤殺）
    const selfScore = overlap(sg, contentGrams[i]);
    let bestScore = selfScore, bestIdx = i;
    Ls.forEach((_, j) => {
      if (j === i) return;
      const sc = overlap(sg, contentGrams[j]);
      if (sc > bestScore) { bestScore = sc; bestIdx = j; }
    });
    // misaligned：最像別課、且差距夠大、且自己分數偏低
    if (bestIdx !== i && selfScore === 0 && bestScore >= 4) {
      const newS = derive(L.content);
      const qualityOK = newS && newS.length >= 15 && newS.length <= 116
        && cjkCount(newS) >= 10
        && !/^[✅❌•·＊*\-0-9．.、）)]/.test(newS)
        && !newS.includes("//");
      if (qualityOK) {
        if (samples.length < 12) samples.push(`${f} ${L.id} 「${L.title.slice(0,16)}」\n   舊:${L.oneLineSummary.slice(0,42)}\n   新:${newS.slice(0,42)}`);
        if (APPLY) L.oneLineSummary = newS;
        totalFixed++; perCh[f.replace(".json","")] = (perCh[f.replace(".json","")]||0)+1; changed = true;
      }
    }
  });
  if (APPLY && changed) fs.writeFileSync(path, JSON.stringify(d, null, 2) + "\n", "utf-8");
}

console.log(`${APPLY ? "APPLIED" : "DRY-RUN"}: ${totalFixed} 條被判定錯位` + (APPLY ? "、已重寫" : "（會重寫）"));
console.log("per-chapter:", Object.entries(perCh).map(([k,v])=>k+":"+v).join("  "));
console.log("\n--- 抽樣 ---");
samples.forEach((s) => console.log(s + "\n"));
