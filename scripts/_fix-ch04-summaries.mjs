import fs from "node:fs";
const FILE = "src/data/chapters/ch04.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const S = {
  "4.1": "JavaScript 是讓網頁「會動」的語言：跑在瀏覽器與 Node；用 <script> 放進 HTML（建議放 body 結尾或加 defer）。",
  "4.2": "變數三兄弟：2026 預設用 const、要改值才用 let、var 別用；核心概念 Hoisting（提升）、Scope（作用域）、Closure（閉包）。",
  "4.3": "型別分兩種：7 種原始型別（值傳遞）vs 物件型別（引用傳遞）；搞懂 Truthy / Falsy 判斷少踩雷。",
  "4.4": "運算符：== 會自動轉型（少用）、=== 嚴格比較（推薦）；還有邏輯運算、Optional Chaining（?.）、展開 / 其餘（...）。",
  "4.5": "函式 = 一段可重複使用的程式（給輸入、回輸出）；三種寫法、箭頭函式的 this 特殊、高階函式是 JS 的靈魂。",
  "4.6": "陣列是最常用的有序清單；重點是函式式操作 map / filter / reduce（不改原陣列、回新的），組成資料處理 pipeline。",
  "4.7": "key-value 容器選擇：Object 最常用、Map（任意鍵、好遍歷）、Set（唯一值）、WeakMap / WeakSet（GC 友善）。",
  "4.8": "class 是物件的模板：constructor、方法、繼承（extends）；2026 多用組合（composition）勝過深繼承。",
  "4.9": "原型鏈是 JS 真正的繼承機制：物件找不到屬性就往 prototype 一層層找、直到 null；class 只是它的語法糖。",
  "4.10": "事件迴圈是 JS 單執行緒卻不卡的秘密：call stack + macrotask / microtask queue 決定誰先跑（Promise 比 setTimeout 先）。",
  "4.11": "Promise 是「未來會有結果的承諾」：pending → fulfilled / rejected；async / await 讓非同步寫起來像同步、好讀好維護。",
  "4.12": "Iterator 協議讓物件能被 for...of 走；Generator（function*）一次 yield 一個值、需要時才算，自製迭代邏輯。",
  "4.13": "DOM 是 HTML 的樹狀結構；用 JS 查節點、改內容 / 樣式、綁事件（addEventListener）跟頁面互動。",
  "4.14": "fetch 發網路請求拿資料（回 Promise）；處理 JSON、錯誤、串流，包成穩健的 API client。",
  "4.15": "瀏覽器存資料 4 種：localStorage / sessionStorage（簡單）、Cookie（帶給後端）、IndexedDB（大量結構化）、Cache API。",
  "4.16": "Web Worker 讓 JS 真的多執行緒（背景運算不卡 UI）；Service Worker 是 PWA / 離線的核心。",
  "4.17": "WebAssembly（WASM）讓 C / Rust 等編成接近原生速度、在瀏覽器跑；重運算（影像 / 遊戲 / 加密）才用。",
  "4.18": "模組系統兩種：ESM（import / export、現代標準、瀏覽器原生）vs CommonJS（require、舊 Node）；2026 用 ESM。",
  "4.19": "JS 常用設計模式：Singleton / Factory / Observer / State Machine / Module；有痛點才套、別硬塞。",
  "4.20": "前端效能：用 Performance API 量測、避開常見地雷、長列表用虛擬列表（Virtual List）；對齊 Core Web Vitals。",
  "4.21": "前端三大攻擊：XSS（注入腳本、用 CSP 擋）、CSRF（跨站偽造請求）、Prototype Pollution；輸入一律不信任。",
  "4.22": "測試三層：單元（Vitest）/ 整合 / E2E（Playwright）；照測試金字塔分配比重、mock 外部依賴。",
  "4.23": "JS 自動垃圾回收、但仍會洩漏（忘了清的 listener / timer / 閉包）；用 WeakRef 與 Chrome Memory tab 檢測。",
  "4.24": "正規表示式（RegExp）是「字串比對規則」：用 regex101 邊試邊看，寫完一定加註解說明它在比對什麼。",
  "4.25": "2026 必懂的 JS 新特性：讓 code 更乾淨的新語法與 API（?. ?? 頂層 await、Array / Object 新方法等）。",
};
let n = 0;
for (const L of d.lessons ?? []) { if (S[L.id]) { L.oneLineSummary = S[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("fixed", n, "oneLineSummary in ch04");
