// Remove templated promo blocks (💼接案小知識 / 🎯面試考點) from a chapter's lesson content.
// These are uniform tail sections; money-in-prose + tips are handled separately by hand.
// usage: node scripts/_strip-promo.mjs ch08            (dry-run, prints what it would cut)
//        node scripts/_strip-promo.mjs ch08 --apply    (writes)
import fs from "node:fs";

const ch = process.argv[2];
const APPLY = process.argv.includes("--apply");
const FILE = `src/data/chapters/${ch}.json`;
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));

// tail-section markers used to find where a block ends
const TAIL_MARKERS = ["☕", "🚀", "💼", "🎯", "⚡", "💡", "🔥", "📌", "🎓", "🧠"];
// blocks we DROP (matched by leading emoji + label)
const DROP = [
  { emoji: "💼", label: "接案小知識" },
  { emoji: "🎯", label: "面試考點" },
];

function removeBlock(content, emoji, label) {
  let changed = false;
  for (;;) {
    const i = content.indexOf(emoji);
    if (i === -1) break;
    // confirm this is the promo block (label appears right after emoji, allowing whitespace)
    const after = content.slice(i + emoji.length, i + emoji.length + 20);
    if (!after.includes(label)) {
      // not the targeted block; bail to avoid nuking an unrelated emoji
      break;
    }
    // find end: next tail marker after this one, else EOF
    const rest = content.slice(i + emoji.length);
    const idxs = TAIL_MARKERS.map((m) => rest.indexOf(m)).filter((x) => x >= 0);
    const end = idxs.length ? i + emoji.length + Math.min(...idxs) : content.length;
    // trim separator whitespace before the block
    let start = i;
    while (start > 0 && /\s/.test(content[start - 1])) start--;
    content = content.slice(0, start) + (end < content.length ? "\n\n" : "") + content.slice(end);
    changed = true;
  }
  return { content, changed };
}

let totalCuts = 0;
for (const L of d.lessons ?? []) {
  let c = L.content ?? "";
  let cut = false;
  for (const { emoji, label } of DROP) {
    const r = removeBlock(c, emoji, label);
    if (r.changed) { c = r.content; cut = true; }
  }
  if (cut) {
    totalCuts++;
    c = c.replace(/\s+$/, "") + "\n";
    if (!APPLY) {
      console.log(`--- ${L.id} ${L.title} : tail after cut ---`);
      console.log(JSON.stringify(c.slice(-180)));
    }
    L.content = c;
  }
}

if (APPLY) {
  fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
  console.log(`APPLIED: stripped promo blocks from ${totalCuts} lessons in ${FILE}`);
} else {
  console.log(`\nDRY-RUN: would strip promo blocks from ${totalCuts} lessons. Re-run with --apply.`);
}
