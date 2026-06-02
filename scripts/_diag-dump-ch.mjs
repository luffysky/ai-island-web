// Dump broken (tag-stripped) code blocks for one chapter, with context.
// usage: node scripts/_diag-dump-ch.mjs ch08
import fs from "node:fs";

const ch = process.argv[2] || "ch08";
const d = JSON.parse(fs.readFileSync(`src/data/chapters/${ch}.json`, "utf-8"));
const FENCE = /```(jsx|tsx|html|vue|svelte)\n([\s\S]*?)```/g;

for (const L of d.lessons ?? []) {
  const c = L.content ?? "";
  const brokenFences = [];
  let m;
  FENCE.lastIndex = 0;
  while ((m = FENCE.exec(c))) {
    if (!m[2].includes("<")) brokenFences.push({ lang: m[1], body: m[2] });
  }
  const brokenPg = (L.playgrounds ?? []).filter(
    (p) => ["html", "jsx", "tsx", "vue", "svelte"].includes((p.language ?? "").toLowerCase()) && !(p.initialCode ?? "").includes("<")
  );
  if (!brokenFences.length && !brokenPg.length) continue;
  console.log("\n========================================");
  console.log(`LESSON ${L.id}  ${L.number}  | ${L.title}`);
  console.log(`  broken fences: ${brokenFences.length} | broken playgrounds: ${brokenPg.length}`);
  brokenFences.forEach((f, i) => {
    console.log(`\n--- FENCE #${i} [${f.lang}] ---`);
    console.log(f.body);
  });
  brokenPg.forEach((p) => {
    console.log(`\n--- PLAYGROUND key=${p.key} [${p.language}] title=${p.title} ---`);
    console.log(p.initialCode);
  });
}
