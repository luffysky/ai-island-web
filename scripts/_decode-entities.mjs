// Fix tag-stripped blocks that are actually HTML-entity-ENCODED (&lt; &gt; ...), not deleted.
// Only touches markup-lang playgrounds / content fences that have no "<" but do have "&lt;".
// usage: node scripts/_decode-entities.mjs ch01            (dry-run)
//        node scripts/_decode-entities.mjs ch01 --apply
import fs from "node:fs";

const ch = process.argv[2];
const APPLY = process.argv.includes("--apply");
const FILE = `src/data/chapters/${ch}.json`;
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const MARKUP = ["html", "jsx", "tsx", "vue", "svelte"];
const FENCE = /```(jsx|tsx|html|vue|svelte)\n([\s\S]*?)```/g;

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
   .replace(/&amp;/g, "&");

const needs = (s) => !s.includes("<") && s.includes("&lt;");

let pg = 0, fe = 0;
for (const L of d.lessons ?? []) {
  for (const p of L.playgrounds ?? []) {
    if (MARKUP.includes((p.language ?? "").toLowerCase()) && needs(p.initialCode ?? "")) {
      if (APPLY) p.initialCode = decode(p.initialCode);
      pg++;
    }
  }
  let c = L.content ?? "";
  let changed = false;
  c = c.replace(FENCE, (m, lang, body) => {
    if (needs(body)) { changed = true; fe++; return "```" + lang + "\n" + decode(body) + "```"; }
    return m;
  });
  if (APPLY && changed) L.content = c;
}

if (APPLY) {
  fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
  console.log(`APPLIED decode: ${pg} playgrounds, ${fe} fences in ${FILE}`);
} else {
  console.log(`DRY-RUN: ${pg} playgrounds, ${fe} fences are entity-encoded (decodable) in ${FILE}`);
}
