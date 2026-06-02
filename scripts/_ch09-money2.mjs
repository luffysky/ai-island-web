import fs from "node:fs";
const FILE = "src/data/chapters/ch09.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const L = d.lessons.find((x) => x.id === "9.25");
let c = L.content;
let start = c.indexOf("**薪資範圍");
let end = c.indexOf("### 9. 6 個月");
if (start < 0 || end < 0) { console.error("boundaries not found"); process.exit(1); }
while (start > 0 && /\s/.test(c[start - 1])) start--;
c = c.slice(0, start) + "\n\n  \n" + c.slice(end);
L.content = c;
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("removed salary/rate blocks from 9.25");
