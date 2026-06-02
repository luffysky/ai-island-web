// 修 ch02 被錯位的 oneLineSummary：依每課實際主題（title+outline+content）重寫成正確白話一句話。
import fs from "node:fs";
const FILE = "src/data/chapters/ch02.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const S = {
  "2.1": "CSS 是網頁的化妝師——HTML 負責骨架、CSS 負責好看；三種寫法 inline / internal / external，實務用獨立的 .css 檔。",
  "2.2": "選擇器就是「跟瀏覽器說要改哪個元素」：標籤 / class / id / 後代組合 / 偽類（:hover）/ 偽元素（::before）。",
  "2.3": "CSS 三大法則：Cascade（串接、衝突時聽誰的）、Specificity（特異性、權重大小）、Inheritance（繼承、子元素自動拿父的樣式）；!important 是核彈少用。",
  "2.4": "每個元素都是一個盒子：content → padding（內距）→ border（邊框）→ margin（外距）四層；box-sizing: border-box 讓寬度好算。",
  "2.5": "display 決定元素「佔多大空間、怎麼排」：block（整行）/ inline（隨文字）/ inline-block / flex / grid / none（隱藏）。",
  "2.6": "Flexbox 是一維排版王者：在一條線（橫或直）上排東西、自動分配空間；justify（主軸）+ align（交叉軸）解決對齊與置中。",
  "2.7": "Grid 是二維排版引擎：像 Excel 同時控制列與欄、用 fr 單位和 grid-template 排版面；auto-fit + minmax 做自適應卡片牆。",
  "2.8": "position 五種定位：static（預設）/ relative（相對自己）/ absolute（相對定位父層）/ fixed（黏視窗）/ sticky（捲到才黏）；z-index 決定誰疊上面。",
  "2.9": "顏色寫法：關鍵字 / Hex / RGB / HSL（最直覺）/ OKLCH（2024+ 新標準），外加漸層與 color-mix。",
  "2.10": "字型決定閱讀體驗：Web Fonts vs 系統字型堆疊（效能）、字級 / 行距 / 字重、可變字型（Variable Fonts）。",
  "2.11": "背景、邊框、陰影（box-shadow / text-shadow）與 filter 濾鏡——把方盒子變好看的裝飾工具。",
  "2.12": "響應式設計（RWD）讓網頁在電腦 / 平板 / 手機都好看：Viewport meta + Media Queries + 標準斷點 + 流體排版。",
  "2.13": "CSS 變數（--xxx）定義一次、整站共用——改一個地方全站變色，做暗黑模式超方便。",
  "2.14": "Transition（狀態改變的過渡）+ Keyframe Animation（自動播放動畫）；只動 transform / opacity 才順、效能好。",
  "2.15": "transform 是「不重排版面的視覺變形」：translate（位移）/ rotate（旋轉）/ scale（縮放）/ skew（傾斜）+ 3D，效能極高。",
  "2.16": "Sass / SCSS 是 CSS 的長大版：變數、巢狀、Mixin、Function、繼承、流程控制——讓 CSS 可程式化、好維護。",
  "2.17": "Tailwind 是 utility-first：不寫 CSS、用一堆小 class 直接排版；2026 indie / 新創幾乎全用，v4 用 @theme / @apply。",
  "2.18": "Bootstrap 是老牌 CSS 框架：現成 Grid 系統 + 元件，快速做出堪用介面；跟 Tailwind 的取捨看專案。",
  "2.19": "CSS-in-JS 把樣式寫進元件：styled-components / Emotion（runtime）、CSS Modules、Vanilla Extract / Panda（零 runtime）。",
  "2.20": "Design Tokens 是設計系統的原子：用三層 token（primitive → semantic → component）統一顏色 / 間距 / 字級，整站一致。",
  "2.21": "好動畫是有目的的：回饋 / 引導 / 連續感 / 愉悅；緩動曲線與時長要拿捏，並尊重 prefers-reduced-motion。",
  "2.22": "無障礙（a11y）：足夠對比度、看得見的 focus 樣式、螢幕閱讀器友善、別只用顏色傳達訊息、觸控目標至少 44×44px。",
  "2.23": "CSS 效能：理解渲染管線、用 contain / content-visibility 跳過離畫面元素、減少 CSS 體積、圖片優化（WebP / AVIF / lazy）。",
  "2.24": "除錯 CSS 靠 Chrome DevTools：看 computed、即時改值、查盒模型；常見問題（置中、溢出、z-index）對照解法。",
  "2.25": "CSS 收尾：命名慣例（BEM / utility）、檔案組織、必備工具、2026『現代 CSS』核心（Container Query / :has / nesting / oklch）。",
};
let n = 0;
for (const L of d.lessons ?? []) { if (S[L.id]) { L.oneLineSummary = S[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("fixed", n, "oneLineSummary in ch02");
