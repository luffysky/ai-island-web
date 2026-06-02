import fs from "node:fs";
const FILE = "src/data/chapters/ch09.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const edits = {
  "9.23": [[
    "薪資（2026 台灣）\n─────────────────\nJunior (1-2 yr)    NT$ 50-70k  React 略高 5%\nMid (3-5 yr)       NT$ 70-100k 持平\nSenior (5+ yr)     NT$ 100-150k 持平\nTech Lead          NT$ 150-250k 持平\n\n→ 5 年以上薪資沒差、React / Vue 都能進",
    "→ React 職缺多、競爭也多；Vue 職缺少、對手也少\n→ 框架不是決定因素、實力和作品才是"
  ]],
  "9.25": [[
    "- **薪資**：Junior NT$ 50-70k、接案 NT$ 30k-500k / 案\n",
    ""
  ]],
};
let n = 0;
for (const L of d.lessons ?? []) {
  const e = edits[L.id]; if (!e) continue;
  for (const [o, nw] of e) {
    if (!L.content.includes(o)) { console.error("MISS", L.id, JSON.stringify(o.slice(0,30))); process.exit(1); }
    L.content = L.content.replace(o, nw); n++;
  }
}
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("applied", n, "edits");
