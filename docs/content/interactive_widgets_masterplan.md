# 互動教具總規劃（2026-07-18）

> 目標：全 80 章「每章依內容配對得上的互動」，但**不硬塞、不重造輪子**。
> 原則：能複用就複用（config 驅動）、能用現成 Playground 就只補資料、真的需要才寫新元件、思辨章不勉強塞。

## ✅ 定案（林董 0718）
1. **12 個新 B 元件全做**（Tier 1→2→3）。
2. **跟著每章一起做**：不另外拉一批鋪 Playground；做到哪章就把該章的 Playground＋B/C/D 教具一起掛上。
3. **預設每章都認真配一個對得上的互動**；「寧缺勿濫」只用在真的湊不出好互動的少數章（留白是例外、不是常態，不能拿來偷懶）。思辨章至少可用 DecisionQuiz 做情境判斷/自測。
> 執行：內容重寫按 🔴→🟠→🟡→🟢 順序；每章 = 內容深寫 + 對應原型（A 補資料 / B 新元件 / C·D config）；第一次需要某 B 元件時就地建好、之後複用。

---

## 一、四種原型（每章對號入座）

| 原型 | 做什麼 | 現況 | 適用 |
|---|---|---|---|
| **A. 即時程式 Playground** | 寫 code 立刻看結果 | ✅ **已存在**（PlaygroundCard：Monaco+預覽+20語言沙盒+sqlite+Pyodide） | 所有語言/框架/DB/爬蟲章——**多半只要補資料** |
| **B. 概念模擬器** | 拉/點看某個機制即時變化 | 部分已建（BoxModel/FunnelSim/Flex/Grid/RwdRuler/LayoutGallery） | 需要「看見抽象概念」的章，多數要寫新元件 |
| **C. 比一比 Lab** | 同輸入比 A/B、學判斷 | ✅ **PromptLab**（config 驅動） | AI prompt 章、也可做「好vs壞」對照（SEO標題/commit/API設計） |
| **D. 決策/自我檢測** | 回答問題給建議 | ✅ **DecisionQuiz**（config 驅動） | 法律情境/職涯/PM/工具選型/IP類型/心法自測 |

**大原則**：A 覆蓋最多章、成本最低（只補資料）；C、D 靠 config 幾乎零新程式；只有 B 要寫新元件。**火力集中在挑對「值得寫的 B 元件」。**

---

## 二、已建的 9 個教具（可複用）

- CSS 家族：LayoutGallery / FlexPlayground / GridPlayground / BoxModel / RwdRuler
- AI 家族：PromptLab（比輸出·config）/ PromptBuilder（圖像 prompt 積木）
- 行銷：FunnelSim（漏斗模擬）
- 通用：DecisionQuiz（決策測驗·config）

---

## 三、建議「新增」的 B 概念模擬器（依複用度排序）

> 只列真的值得寫的。每個都盡量餵多章。

**Tier 1（複用最廣、先做）**
1. **RegexTester**：打 regex → 即時 highlight 匹配 + 群組說明。餵 ch04 JS、ch26 Python、ch28/29/30 爬蟲。
2. **JsonTree**：貼 JSON → 摺疊樹 + 型別上色 + 路徑。餵 ch06 JSON、ch20 API、ch14。
3. **HttpInspector**：送一個請求 → 看 method/status/headers/body 流動（可預設幾個範例）。餵 ch16 後端、ch20 API、ch39 LINE Bot、ch75 HTTP。
4. **PriorityMatrix**：2×2 拖放（重要/緊急、影響/成本）。餵 ch43 專案管理、ch44 PdM、ch45 協作、ch60 心法、ch58 職涯。

**Tier 2（單領域高價值）**
5. **CronBuilder**：cron 字串 → 白話解讀 + 下幾次觸發。餵 ch50 n8n、ch24 監控、DevOps。
6. **Tokenizer**：貼中英文 → 看怎麼切 token、算幾個。餵 ch46 AI原理、ch79 LLM、ch63。
7. **SortingViz / DataStructureViz**：排序動畫 / stack·queue·tree 操作。餵 ch07 程式邏輯、ch68 修煉、ch77。
8. **GitGraph**：按 commit/branch/merge/rebase 看分支圖。餵 ch15 DevOps、git 段落。

**Tier 3（錦上添花、單章為主）**
9. **NeuralForward**：拉輸入/權重看前向傳播數字流。餵 ch46、ch78 深度學習。
10. **AuthFlow**：點按走一遍 JWT/OAuth，看 token 怎麼傳。餵 ch21 認證授權。
11. **ColorContrast（a11y）**：調前景/背景 → 算對比、過不過 WCAG。餵 ch03 UI/UX、ch12 資安。
12. **MLBoundary**：加點/調參 → 看決策邊界。餵 ch77 機器學習。

---

## 四、逐章群 → 配什麼（總覽）

**🔴 內容要重寫的章**（互動一起做）
- ch57 法律/倫理 → **DecisionQuiz**（這樣做合不合法/該怎麼辦情境）
- ch58 職涯 → **DecisionQuiz**（AI 時代方向自測）+ 可加 PriorityMatrix
- ch59 一人公司 → FunnelSim 複用 / DecisionQuiz（商業模式）
- ch60 心法 → **PriorityMatrix**（重要vs緊急）或純內容（思辨章不硬塞）
- ch03 UI/UX → **ColorContrast** + 複用 LayoutGallery
- ch13 SEO → **比一比 Lab**（好vs壞標題/meta）+ 複用 FunnelSim
- ch43/44/45 PM → **PriorityMatrix** + DecisionQuiz
- ch47 AI應用工程/ch48 Vibe/ch49 Agent/ch50 n8n → PromptLab 複用 + **CronBuilder**(50) + 可選 FlowBuilder

**🟠 內容偏薄的章** → 補深 + 對應原型（ch06→JsonTree、ch14→HttpInspector、ch12→ColorContrast…）

**🟡 技術重章（內容有料）** → **主打 A 即時 Playground（補資料）** + 對應 B：
- ch01 HTML→DomTree/Playground · ch04 JS→RegexTester/Playground · ch17 SQL→sqlite Playground · ch07→SortingViz · ch16/20→HttpInspector+JsonTree · ch21→AuthFlow · ch26/28→RegexTester+Playground · ch46→Tokenizer+NeuralForward…

**🟢 練習題已乾淨的章（附錄/進階/ML入門）** → 抽查內容 + 補 A Playground 或對應 B；ch77→SortingViz/MLBoundary、ch78→NeuralForward、ch79→Tokenizer；速查附錄（ch61-70）可放常駐小工具（JsonTree/RegexTester/HttpInspector）。

---

## 五、成本與節奏建議

- **最省力大覆蓋**：先把 A（即時 Playground）鋪到所有 code 章——只補資料、零新程式，一次讓幾十章「有得玩」。
- **新元件**：Tier 1 四個（RegexTester/JsonTree/HttpInspector/PriorityMatrix）投報最高，先做這四個能覆蓋一大票章。
- **config 複用**：PromptLab、DecisionQuiz 幾乎零成本擴到很多章。
- **不硬塞**：純思辨/速查章沒有好互動就不放，寧缺勿濫。

## 六、技術一致性（所有教具共用規範）
- 亮暗 token（bg-bg-card/border/text-fg-muted/accent）、RWD 不破版（窄屏可縮/可捲、不 hidden 硬切）。
- 無新前端依賴優先（純 div + lucide）。
- config 驅動的（PromptLab/DecisionQuiz）用 `demo.config` 帶資料，不寫死。
- 型別加在 `LessonDemo.type` union、`LessonDemos.tsx` 白名單派發、`src/components/chapter/demos/` 一元件一檔。
