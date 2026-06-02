import fs from "node:fs";
const FILE = "src/data/chapters/ch07.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const S = {
  "7.1": "程式 = 給電腦的指令清單；你寫的 code 要經過編譯（一次轉機器碼、快）或直譯（逐行翻譯、彈性）或 JIT（混合）才能跑。",
  "7.2": "變數是「存資料的名字」、所有語言都有；分動態 / 靜態型別、強 / 弱型別——決定你何時、要不要先講明型別。",
  "7.3": "基本資料型態：整數（會溢位）、浮點數（有精度陷阱、0.1+0.2≠0.3）、字串、布林；先懂它們的雷再用。",
  "7.4": "運算子四大類：算術（+ - * / %）、比較、邏輯（&& ||）、位元，再加三元（? :）；取餘數 % 很實用。",
  "7.5": "條件分支：if / else if / else 走岔路、switch 多分支簡化、Pattern Matching（2020+）更強的條件解構。",
  "7.6": "迴圈 = 重複做同件事：for（固定次數）、while（條件成立就跑）、迭代器 / 懶式評估（需要時才算）。",
  "7.7": "函數是「抽象的單位」：把一段邏輯打包取名、給參數回傳結果；參數、預設值、可變參數（args）是基本功。",
  "7.8": "陣列是「排隊的格子」、有順序、從 0 開始數；所有語言都有，常用操作是增刪查改與遍歷。",
  "7.9": "字典（Dict / Map / HashMap）是「名字對應值」的容器、查找超快；建立、增刪、遍歷是日常。",
  "7.10": "更多資料結構：Set（不重複）、Tuple（固定多型別）、Stack（後進先出）、Queue（先進先出）、Tree / Graph。",
  "7.11": "OOP 用「狗」理解：class 是藍圖、object 是造出來的狗、method 是牠會的動作、屬性是牠的資料；this / self = 牠自己。",
  "7.12": "OOP 三大特性：繼承（沿用父類能力）、封裝（藏內部細節）、多型（同方法不同表現）。",
  "7.13": "函數式三核心：純函數（同輸入同輸出、無副作用）、不可變（不改原資料）、map / filter / reduce。",
  "7.14": "型別系統四維度：動態 vs 靜態、強 vs 弱；進階有型別推導、聯合型別（Union）、泛型（Generics）。",
  "7.15": "記憶體模型：Stack（快、放區域變數）vs Heap（放物件）；指標 / 參考是「指向某地址」；值傳遞 vs 參考傳遞。",
  "7.16": "錯誤處理三流派：Exception（try / catch / finally）、Result（Rust / Swift）、Option / panic；別吞錯、要處理。",
  "7.17": "模組化：把 code 拆檔、用 import / export 互相取用、靠 Package Manager 裝別人寫好的套件。",
  "7.18": "好命名 5 原則 + 一致縮排 + Linter 自動抓爛 code；風格一致比個人喜好重要。",
  "7.19": "設計模式是「常見問題的成熟解法」：Singleton（只有一個）、Factory（決定 new 哪個）、Observer（事件通知訂閱者）；有痛點才用。",
  "7.20": "並發基礎：行程 vs 執行緒 vs 鎖；為什麼要並發（善用多核 / 等 I/O 時做別的）、小心競爭條件（Race Condition）。",
  "7.21": "async / await 是「等某件事時先去做別的」、靠 event loop 驅動；別在 async 裡寫會阻塞 event loop 的重運算。",
  "7.22": "並發另一哲學：不共享記憶體、改用訊息傳遞（Actor / Channel）；Go 的 channel 是代表、較不易出並發 bug。",
  "7.23": "Big O 講「資料變大時會慢多少」：O(1) / O(log n) / O(n) / O(n²)…；選對資料結構（陣列 vs 字典）差很多。",
  "7.24": "四類常見演算法：排序、搜尋、遞迴、動態規劃（DP）；先懂思路、再記實作。",
  "7.25": "字串處理：切 / 接 / 取代 / 內插（Template）；正則表達式（Regex）做「文字模式比對」、用 regex101 邊試邊學。",
  "7.26": "I/O 三種：檔案（讀寫模式）、網路（HTTP method）、資料庫；本質都是「程式跟外界交換資料」。",
  "7.27": "測試三層：單元 / 整合 / E2E；用 AAA 模式（Arrange / Act / Assert）、mock 假依賴；TDD 是先寫測試再寫 code。",
  "7.28": "Debug 5 步法 + 5 大 bug 類型；log 哲學是 production 除錯之本——印對的東西、別印一堆雜訊。",
};
let n = 0;
for (const L of d.lessons ?? []) { if (S[L.id]) { L.oneLineSummary = S[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("fixed", n, "oneLineSummary in ch07");
