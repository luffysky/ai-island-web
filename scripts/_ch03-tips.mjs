import fs from "node:fs";
const FILE = "src/data/chapters/ch03.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const tips = {
  "3.1": { type: "practical", text: "分清 UI 與 UX 的簡單檢查：UI 是『按鈕好不好看、對不對齊』，UX 是『使用者三步內能不能完成目的』。畫面漂亮卻要點七層才買得到，就是 UX 出問題。" },
  "3.7": { type: "practical", text: "Button 別只設計『正常』那一種：default / hover / active / disabled / loading 五種狀態都要畫——尤其 loading 和 disabled，是新手最常漏、卻最影響體驗的。" },
  "3.13": { type: "practical", text: "Toast 用在『非阻斷』的即時回饋（已儲存、已複製）。需要使用者動作的重要錯誤別用 toast——那種該用 inline 訊息或 dialog，免得一閃就消失沒人看到。" },
  "3.19": { type: "practical", text: "做 AI streaming UI 記得處理『還沒開始回 / 正在輸出 / 出錯』三種狀態，並讓使用者能中途停止。少了 loading 與中止，體驗會很像當機。" },
};
let n = 0;
for (const L of d.lessons ?? []) { if (tips[L.id]) { L.tip = tips[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("replaced", n, "tips");
