import fs from "node:fs";
const FILE = "src/data/chapters/ch09.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const tips = {
  "9.1": { type: "practical", text: "選 Vue 還是 React 別空想：各花一小時各做一個 counter + todo，憑手感決定。兩者概念其實 80% 互通，學會一個再轉另一個很快。" },
  "9.7": { type: "practical", text: "Pinia 比 Vuex 簡單很多：一個 store 就是一個 defineStore，state / getters / actions 像寫普通物件。從『把原本要 props 傳好幾層的狀態搬進 store』開始練最有感。" },
  "9.25": { type: "practical", text: "Vue 不是『次等的 React』、是不同哲學的選擇：template + 響應式 vs JSX + 手動優化。理解它的取捨，比硬比較誰強更有用。" },
};
let n = 0;
for (const L of d.lessons ?? []) { if (tips[L.id]) { L.tip = tips[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("replaced", n, "tips");
