import fs from "fs";
import path from "path";
const dir = "./src/data/chapters";
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const byCh = {};
for (const [id, v] of Object.entries(data)) {
  const ch = "ch" + String(id.split(".")[0]).padStart(2, "0");
  (byCh[ch] ||= {})[id] = v;
}
let n = 0;
for (const ch of Object.keys(byCh)) {
  const f = path.join(dir, ch + ".json");
  const c = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [id, v] of Object.entries(byCh[ch])) {
    const l = c.lessons.find((x) => x.id === id);
    if (!l) { console.log("MISS", id); continue; }
    const type = Array.isArray(v) ? v[0] : "tip";
    const text = Array.isArray(v) ? v[1] : v;
    l.tip = { type, text };
    n++;
  }
  fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n");
}
console.log("套用 tips:", n, "| 章節:", Object.keys(byCh).join(" "));
