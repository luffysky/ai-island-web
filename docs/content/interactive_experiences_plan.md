# 全站互動體驗規劃（2026-07-17）

> 目標：每章依內容型態，疊上「看得到、玩得到」的互動教具。分三層：
> - **L2 可編輯即時預覽**（Playground，**infra 已存在**，多數只要補資料）
> - **L3 引導式無碼教具**（點/拉即體驗，**要寫新元件**、可全站複用）
> - 兩者混用：概念先用無碼教具體驗 → 再給編輯器讓學生動手。
>
> 一個教具元件盡量餵多章（複用優先）。下表按「複用廣度 × 教學價值」排優先。

## 引導式教具（L3，要寫新元件）— 依複用度排序

| 教具元件 | 做什麼（點/拉即體驗） | 主要餵哪些章 | 優先 |
|---|---|---|---|
| `css-layout` | 點 flex/grid/block 按鈕，方塊即時重排、標出差異 | ch02 CSS、ch03 UI/UX | 🔥 POC |
| `rwd-ruler` | 拖拉寬度，跨斷點 layout 當場變、顯示現在幾 px | ch02、ch03、ch11 行動App、ch14 PWA | 🔥 POC |
| `box-model` | 拉 padding/margin/border 滑桿，即時看盒子脹縮 | ch02、ch03 | 高 |
| `flex-playground` | 下拉 justify/align/wrap，即時看 flex 子項排列 | ch02、ch08/09 版面 | 高 |
| `prompt-lab` | 同一 prompt 丟多模型/多溫度，並排比輸出、學判斷 | ch46~51、ch55、ch63 AI 全系列 | 🔥 高 |
| `js-behavior` | 動畫演示事件冒泡 / debounce vs throttle / 事件迴圈 | ch04 JS、ch08 React | 高 |
| `dom-tree` | 點 HTML 節點 → 高亮對應畫面，看 DOM 樹 | ch01 HTML、ch04 | 中 |
| `http-inspector` | 送一個請求，看 method/status/headers/body 流動 | ch16 後端、ch20 API、ch75 HTTP | 高 |
| `json-tree` | 貼 JSON → 摺疊樹 + 型別上色 + 路徑查詢 | ch06 JSON | 中 |
| `regex-tester` | 打 regex → 即時 highlight 匹配 + 群組說明 | ch04、ch26、ch28 爬蟲 | 中 |
| `sql-join-viz` | 拖表 + 選 JOIN 型別 → 視覺化哪些列被配對（已有 sqlite 沙盒可補） | ch17 SQL、ch18 NoSQL | 中 |
| `auth-flow` | 點按走一遍 JWT / OAuth 流程動畫，看 token 怎麼傳 | ch21 認證授權 | 中 |
| `git-graph` | 按 commit/branch/merge/rebase，看分支圖變化 | ch15 DevOps、git 段落 | 中 |
| `tokenizer` | 貼中英文 → 看怎麼切 token、算幾個 token | ch79 LLM、ch46 AI原理 | 中 |
| `neural-forward` | 拉輸入/權重滑桿，看神經元前向傳播數字流動 | ch46、ch78 深度學習 | 中 |
| `ml-boundary` | 調參數/加點，看決策邊界即時變（分類視覺化） | ch77 機器學習 | 中 |
| `data-structure-viz` | push/pop/enqueue/插入，看 array/stack/queue/tree 動畫 | ch07 邏輯、ch68 修煉 | 中 |
| `sorting-viz` | 選演算法 → 看排序過程動畫 + 比較次數 | ch07、ch77 | 低 |
| `color-a11y` | 調前景/背景色 → 即時算對比值、過不過 WCAG | ch03 UI/UX、ch12 資安? | 低 |
| `flow-builder` | 拖節點連線，體驗自動化/agent pipeline | ch49 Agent、ch50 n8n、ch48 | 低 |

## 可編輯即時預覽（L2，多數只要補資料）

Playground 已支援：HTML/CSS/JS 本地即時預覽、Python(Pyodide)、20+ 語言遠端沙盒、SQL(sqlite)、雲端存檔、虛擬終端機。要做的多半是**在對的 lesson 掛上好的起始碼 + hint**：

- 語言/框架章（ch01,02,04,05,08,09,10,26,27,28,31,32,33,34,35,36,39,40,41…）→ 每個語法點掛「改這段、看結果」。
- SQL（ch17）→ 掛 sqlite 沙盒，真的下 query 看結果。
- 爬蟲（ch28,29,30）→ 掛 Python 沙盒跑抓取範例。
- 資料分析（ch27）→ Pyodide 跑 pandas/matplotlib，圖直接出。

## 創作/商業章（ch51~60）能加什麼

這些沒 code，L2/L3 用不到傳統教具，改用：
- `prompt-lab`（同 prompt 比多模型/溫度）→ ch51 寫作、ch52 設計提示、ch55 行銷文案。
- **before/after 樣本畫廊**（預存 prompt→實際產出）→ ch52 設計、ch53 影片、ch56 虛擬IP：看「爛 prompt vs 好 prompt」出的差別。
- **互動檢核表 / 決策樹**（點選情境 → 給對應建議）→ ch57 法律、ch58 職涯、ch60 心法。

## 附錄/速查章（ch61~70）

- `json-tree`、`regex-tester`、`http-inspector` 這類「小工具」本身就適合放進速查章當**常駐工具**。
- ch70「程式碼遊樂場」→ 直接就是 Playground 展示場。

## 建置順序建議
1. **POC**：`css-layout` + `rwd-ruler`（ch02）← 進行中，驗證 L3 架構。
2. `prompt-lab`（餵 AI 全系列，複用最廣、對創作章是唯一互動解）。
3. `box-model` + `flex-playground`（把 ch02/03 補滿）。
4. `http-inspector` + `json-tree` + `regex-tester`（後端/工具章通吃）。
5. 其餘依章節重寫進度逐一補。

## 技術
- 新教具＝`src/components/chapter/demos/` 下的元件，由 `LessonDemos.tsx` 依 `demo.type` 派發。
- 資料：lesson 新增 `demos: [{type, title?, note?, config?}]`（已加進 `types.ts`）。
- 每個教具：亮暗 token、RWD 不破版（窄屏可縮/可捲、不 hidden 硬切）、無新套件優先。
