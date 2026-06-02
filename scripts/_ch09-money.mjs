import fs from "node:fs";
const FILE = "src/data/chapters/ch09.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const edits = {
  "9.10": [[
    "A 用 React 寫了 100 個 demo project、沒上線、找不到工作\nB 用 Vue 寫了 1 個 SaaS、月入 NT$ 50,000、轉自由工作者\n\nC 在 Meta 寫 React、年薪 NT$ 500 萬\nD 在阿里寫 Vue、年薪 RMB 80 萬（≈ NT$ 350 萬）\n\n→ 框架不決定你的薪水、產品 + 經驗 + 市場才決定",
    "A 用 React 寫了 100 個 demo project、卻都沒上線\nB 用 Vue 寫了 1 個 SaaS、真的上線、有人在用\n\nC 在大公司寫 React、D 在另一家寫 Vue、兩人都做得不錯\n\n→ 框架不決定結果、產品 + 經驗 + 市場才決定"
  ]],
  "9.25": [[
    "   接到第一份 Vue 工作 or 第一個案子\n   月薪 NT$ 50k+ or 案費 NT$ 30k+",
    "   開始投履歷 / 接第一個小案子\n   重點是把實戰經驗和作品累積起來"
  ]],
};
let n = 0;
for (const L of d.lessons ?? []) {
  const e = edits[L.id]; if (!e) continue;
  for (const [oldS, newS] of e) {
    if (!L.content.includes(oldS)) { console.error("MISS in", L.id, JSON.stringify(oldS.slice(0,40))); process.exit(1); }
    L.content = L.content.replace(oldS, newS); n++;
  }
}
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("applied", n, "money edits");
