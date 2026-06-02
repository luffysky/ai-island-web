// Apply re-authored code blocks to a chapter JSON, by positional match.
// Fix files live in scripts/_<ch>fix/<lessonId>.txt with sections:
//   @@@F0            -> replaces the 0th BROKEN (tag-stripped) fenced block in content
//   @@@F1            -> 1st broken fence ... etc
//   @@@PG <key>      -> replaces playground initialCode with that key
// Section body is raw code (no escaping needed). Fence language is preserved.
// usage: node scripts/_apply-ch-fixes.mjs ch08
import fs from "node:fs";
import path from "node:path";

const ch = process.argv[2];
if (!ch) { console.error("usage: node scripts/_apply-ch-fixes.mjs ch08"); process.exit(1); }
const FILE = `src/data/chapters/${ch}.json`;
const FIXDIR = `scripts/_${ch}fix`;
const FENCE = /```(jsx|tsx|html|vue|svelte)\n([\s\S]*?)```/g;

const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
let appliedFences = 0, appliedPg = 0;

function parseFixFile(text) {
  const fences = {}; const pg = {};
  const lines = text.split("\n");
  let cur = null, buf = [];
  const flush = () => {
    if (!cur) return;
    const body = buf.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
    if (cur.kind === "F") fences[cur.idx] = body;
    else pg[cur.key] = body;
  };
  for (const line of lines) {
    const mf = line.match(/^@@@F(\d+)\s*$/);
    const mp = line.match(/^@@@PG\s+(\S+)\s*$/);
    if (mf) { flush(); cur = { kind: "F", idx: Number(mf[1]) }; buf = []; }
    else if (mp) { flush(); cur = { kind: "PG", key: mp[1] }; buf = []; }
    else buf.push(line);
  }
  flush();
  return { fences, pg };
}

for (const L of d.lessons ?? []) {
  const fixPath = path.join(FIXDIR, `${L.id}.txt`);
  if (!fs.existsSync(fixPath)) continue;
  const { fences, pg } = parseFixFile(fs.readFileSync(fixPath, "utf-8"));

  // --- content fences ---
  let c = L.content ?? "";
  const matches = [];
  let m; FENCE.lastIndex = 0;
  while ((m = FENCE.exec(c))) { if (!m[2].includes("<")) matches.push(m); }
  // replace last-to-first so earlier indices stay valid
  for (let i = matches.length - 1; i >= 0; i--) {
    if (!(i in fences)) continue;
    const mm = matches[i];
    const newFull = "```" + mm[1] + "\n" + fences[i] + "\n```";
    c = c.slice(0, mm.index) + newFull + c.slice(mm.index + mm[0].length);
    appliedFences++;
  }
  L.content = c;

  // --- playgrounds ---
  for (const p of L.playgrounds ?? []) {
    if (p.key in pg) { p.initialCode = pg[p.key]; appliedPg++; }
  }
}

fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log(`applied ${appliedFences} fences, ${appliedPg} playgrounds to ${FILE}`);
