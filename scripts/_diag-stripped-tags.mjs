import fs from "node:fs";
import path from "node:path";

const dir = "src/data/chapters";
const files = fs.readdirSync(dir).filter((f) => /^ch\d+\.json$/.test(f)).sort();

const FENCE = /```(jsx|tsx|html|vue|svelte)\n([\s\S]*?)```/g;
const pgBad = {}, contentBad = {}, totalPg = {};

for (const f of files) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); } catch { continue; }
  for (const L of d.lessons ?? []) {
    const c = L.content ?? "";
    let m;
    FENCE.lastIndex = 0;
    while ((m = FENCE.exec(c))) {
      if (!m[2].includes("<")) contentBad[f] = (contentBad[f] ?? 0) + 1;
    }
    for (const p of L.playgrounds ?? []) {
      const lang = (p.language ?? "").toLowerCase();
      totalPg[f] = (totalPg[f] ?? 0) + 1;
      const code = p.initialCode ?? "";
      if (["html", "jsx", "tsx", "vue", "svelte"].includes(lang) && !code.includes("<")) {
        pgBad[f] = (pgBad[f] ?? 0) + 1;
      }
    }
  }
}

const keys = [...new Set([...Object.keys(pgBad), ...Object.keys(contentBad)])].sort();
console.log("chapter\tbad_playgrounds\tbad_content_fences");
for (const k of keys) console.log(`${k}\t${pgBad[k] ?? 0}\t${contentBad[k] ?? 0}`);
console.log("TOTAL bad playgrounds:", Object.values(pgBad).reduce((a, b) => a + b, 0));
console.log("TOTAL bad content fences:", Object.values(contentBad).reduce((a, b) => a + b, 0));
