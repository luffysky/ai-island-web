import fs from "node:fs";
const FILE = "src/data/chapters/ch08.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const tips = {
  "8.1": { type: "practical", text: "與其反覆看教學，不如馬上 `npm create vite@latest` 開一個空專案，把這課的 Component / Props / State 各寫一個最小範例跑起來。動手 10 分鐘，比讀一小時還記得牢。" },
  "8.7": { type: "practical", text: "key 出問題最典型的徵兆：刪掉清單中間一項後，其他項的 input 內容跑位了。看到這現象，先檢查是不是用了 index 當 key——改成穩定的 id 就解決。" },
  "8.13": { type: "practical", text: "判斷該用 useState 還是 useReducer 的簡單原則：當你發現好幾個 setState 常要一起改、或更新邏輯開始長出 if / switch，就是換 useReducer 的時機。" },
  "8.19": { type: "practical", text: "測試優先用 getByRole（按鈕、輸入框…）而不是 getByTestId。前者逼你從『使用者看得到什麼』的角度寫，測試更穩，也順手檢查了無障礙。" },
  "8.23": { type: "trend", text: "React 19 已正式發佈、Next.js 15 預設 React 19。寫表單時 useActionState + useOptimistic 是最順手的新組合——提交狀態與樂觀更新都內建，不用再自己接 loading / rollback。" },
};
let n = 0;
for (const L of d.lessons ?? []) { if (tips[L.id]) { L.tip = tips[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("replaced", n, "tips");
