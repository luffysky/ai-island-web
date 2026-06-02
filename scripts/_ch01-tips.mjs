import fs from "node:fs";
const FILE = "src/data/chapters/ch01.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const tips = {
  "1.1": { type: "practical", text: "學 HTML 最快的方式是邊看別人的網站邊學：Chrome 按 F12 開 Elements，游標移到頁面任何地方就能看到對應的 HTML 標籤。看不懂的標籤直接 google『標籤名 + MDN』。" },
  "1.7": { type: "practical", text: "table 只用來放『真正的表格資料』、不要拿來排版（排版是 CSS Grid / Flexbox 的工作）。記得加 thead / tbody 和 scope 屬性，螢幕報讀軟體才讀得懂。" },
  "1.13": { type: "practical", text: "想測 PWA 有沒有設好，用 Chrome DevTools 的 Lighthouse 跑一次 PWA 分數，它會逐項告訴你缺 manifest、缺 service worker 還是缺 icon。" },
  "1.18": { type: "practical", text: "檢查無障礙最快的方法：把滑鼠收起來，只用 Tab 鍵走一遍網頁。如果有按鈕 Tab 不到、或看不出目前焦點在哪，就是 a11y 出問題了。" },
  "1.20": { type: "practical", text: "改完 OG 標籤後用各平台的偵錯工具實測——Facebook Sharing Debugger、X Card Validator——它們會顯示實際抓到的縮圖與標題，也能強制清快取。" },
  "1.21": { type: "practical", text: "寫完 JSON-LD 丟進 Google 的 Rich Results Test 驗證，它會告訴你格式對不對、Google 讀不讀得到。type 選錯（Article / Product / FAQ…）是最常見的錯。" },
  "1.25": { type: "milestone", text: "做完這個 portfolio 就有一個自己的作品集網站可以放上網。HTML 只是第一步、後續再學 CSS / JS / 互動，就能做出更完整的作品。" },
};
let n = 0;
for (const L of d.lessons ?? []) { if (tips[L.id]) { L.tip = tips[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("replaced", n, "tips");
