import fs from "node:fs";
const FILE = "src/data/chapters/ch26.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const L = d.lessons.find((x) => x.id === "26.1");
if (!L) { console.error("26.1 not found"); process.exit(1); }
const section = fs.readFileSync("scripts/_ch26_envvar.txt", "utf-8").replace(/\n+$/, "");
const anchor = "重新讀環境變數）。";
if (!L.content.includes(anchor)) { console.error("anchor not found"); process.exit(1); }
if (L.content.includes("找不到指令」？環境變數")) { console.log("already inserted, skip"); process.exit(0); }
// 在警告那一行之後、插入新 section（用 \n\n  \n 分隔、跟其他 ### 段一致）
L.content = L.content.replace(anchor + "。".slice(0,0), anchor); // no-op guard
L.content = L.content.replace(anchor, anchor + "\n\n  \n" + section);
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("inserted env-var section into 26.1; content len now", L.content.length);
