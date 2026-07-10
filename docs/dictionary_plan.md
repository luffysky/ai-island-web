# 程式辭典（Dictionary）規劃書

> 產出：2026-07-10。一句話：**繁中原生、白話、AI 可解釋的「程式術語 × 語法 × 工程師黑話」辭典**，讓看不懂術語的新手敢開始。與剛定錨的靈魂同一條線（`docs/grant/repositioning.md`：降低對程式的恐懼）。

## 0. 決策（老闆拍板）
- 獨立路由 **`/dictionary`**（程式辭典）。
- 首批 **5000 條、直接手寫、不花 API**（我 author，非跑生成器）。→ 實務上分批灌、MVP 先上一個可用批次，之後續補到 5000。
- 未來 **語言島**（英文/日文…）若也要辭典 → 做在 **`/語言島`（`/language-island`）** 底下；本辭典 schema 預留 `domain` 欄位共用（`programming` / `english` / `japanese`…），一套資料表撐所有辭典。

## 1. 為什麼做（價值）
- **打中新手頭號恐懼**：滿螢幕看不懂的英文術語與黑話 → 放棄。白話＋比喻的辭典正是解方。
- **SEO / GEO 長尾入口**：「`async` 是什麼」「什麼是 technical debt」「`git rebase` 意思」等查詢量大；`DefinedTerm` JSON-LD 對 AI 爬蟲友善。
- **接得上現成基建**：綠寶（解釋/生成）、i18n 翻譯管線、DB 內容、搜尋、章節「術語英中對照」規格。
- **差異化**：繁中原生 + AI 島語氣（人話、生活比喻）+ 可一鍵問綠寶。

## 2. 資料模型 `dictionary_terms`
| 欄位 | 說明 |
|---|---|
| `id` uuid PK | |
| `slug` text unique | 網址用（如 `async`、`technical-debt`、`git-rebase`） |
| `domain` text | `programming`（本期）／未來 `english`/`japanese`（語言島共用） |
| `term` text | 主詞（英文/原文，如 `async`） |
| `aliases` text[] | 別名/同義（`asynchronous`、`非同步`） |
| `zh_name` text | 中文名（非同步） |
| `category` text | `syntax`(語法) / `concept`(CS 概念) / `slang`(工程師黑話) / `tool` / `error` |
| `langs` text[] | 語言標籤（`python`,`javascript`,`css`,`sql`,`general`…） |
| `plain` text | **白話解釋**（一兩句、國中生聽得懂） |
| `analogy` text | 生活比喻（可空） |
| `example` text | 小範例（程式碼或情境，可空） |
| `related` text[] | 相關詞 slug |
| `difficulty` int | 1–3（新手/一般/進階） |
| `views` int | 熱度 |
| `created_at`/`updated_at` | |

- RLS：**公開讀**；寫入走 service_role（seed/admin）。
- 索引：`slug` unique、`domain`、`category`、`langs` GIN、全文/trigram 搜尋（`term`+`zh_name`+`plain`）。

## 3. 頁面 / API
- **`/dictionary`**（browse）：搜尋框 + 篩選（語言 / 分類 / 難度）+ A-Z / 熱門；卡片列表。`force-dynamic` 或 `revalidate`。
- **`/dictionary/[slug]`**（詳解）：term + 中文名 + 白話 + 比喻 + 範例 + 相關詞（可點）+「不懂？問綠寶」按鈕；掛 `DefinedTerm` JSON-LD、進 sitemap。
- **API**：`GET /api/dictionary?q=&lang=&category=&difficulty=&domain=programming&offset=`（分頁）；`GET /api/dictionary/[slug]`。
- **i18n**：`domain=programming` 的 term 是英文原文（不機翻），`plain`/`analogy` 走既有 `content_translations`（source_type 新增 `dictionary`）→ en/ja/ko。
- **綠寶整合（後續）**：詳解頁「問綠寶」帶入該詞 context；章節/部落格內文術語 hover 秒懂（phase 2）。
- **RWD**：搜尋+篩選手機可收合；卡片單欄；長內容 scroll 不 hidden。

## 4. 內容規格（每條的寫法）
- **白話優先**：先講「這是什麼、幹嘛用的」，再放正式定義。避免用術語解釋術語。
- **比喻**：能比就比（生活化），不硬湊。
- **範例**：語法類給最短能懂的 snippet；黑話類給情境（「PM 說『先技術債擋著』意思是…」）。
- **黑話最有記憶點**：technical debt、rubber duck debugging、yak shaving、bikeshedding、footgun、boilerplate、race condition（口語）、magic number、spaghetti code、rubber stamp、bus factor…
- 分類均衡：語法（各語言關鍵字/運算子）＋ CS 概念（變數/遞迴/複雜度/雜湊…）＋ 黑話 ＋ 工具（git/npm/docker…）＋ 常見錯誤（NameError/segfault…）。

## 5. 種子策略（往 5000）
- **手寫、零 API**：author 進 `src/data/dictionary/*.ts`（或 json），`scripts/import-dictionary.mjs` 冪等灌 DB（依 slug upsert）。
- **分批**：MVP 先上第一批（核心常見詞 + 黑話），之後每批續補、`import` 冪等可重跑。累積到 ~5000。
- 誠實：5000 是目標、非一次到位；每批品質優先。

## 6. Roadmap
- **MVP（本期）**：migration + `/dictionary` browse/detail + API + 第一批種子 + sitemap/JSON-LD。
- **P1**：綠寶「問這個詞」整合、章節/部落格 hover 秒懂、i18n 翻譯接上。
- **P2**：熱度排序、每日一詞、我的生詞本（收藏）、測驗整合（術語小測）。
- **P3（語言島）**：`/語言島` 上英文/日文辭典，沿用同表 `domain='english'|'japanese'`。

---

# 附：語言島（Language Island）初步規劃

> 老闆提到之後要做「語言島」（英文/日文…）。這裡先立個骨架，讓程式辭典的 schema 現在就對齊、之後不用重做。

- **定位**：AI 島的第三/第四座島 —— 把「學語言」也做成 AI 陪伴式（延續兩島同魂：降低對「學外語」的恐懼）。路由 `/language-island`（顯示名「語言島」）。
- **內容**：英文 / 日文（未來可擴）的「單字 × 例句 × 文法 × 情境會話」+ AI 陪練（口說/寫作批改）+ 遊戲化（同島嶼經濟/Z幣）。
- **辭典共用**：語言島的英文/日文辭典＝`dictionary_terms` 的 `domain='english'|'japanese'`，同一套 browse/detail/搜尋元件、只換 domain 與欄位語意（`term`=單字、`zh_name`=中譯、`plain`=白話解釋、`example`=例句）。→ **程式辭典先把元件做成 domain 參數化，語言島直接複用。**
- **AI 共用**：綠寶/多聞可當語言陪練；模型路由/配額/記憶/成本記帳全共用（跟創作島一樣，一套 AI 基建撐多島）。
- **狀態**：本期只立骨架 + schema 對齊；語言島實作為後續獨立專案。
