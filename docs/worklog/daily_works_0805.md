# 每日工作日誌 0805

## A段：Nami 回饋——`*` 打包/解包混淆（ch26 26.6）+ lambda 講清楚

**問題（logerr.md）**：教材把星號 `*` 講成「打包參數（`*args`）」，後面又用 `*nums` / `**data` 示範「解包／攤開」——同一顆星號、相反意思，中間沒有橋接說明「差別在於它在『定義』還是『呼叫』」。Nami 因此推論「參數前面有星號就是打包參數」而卡住，綠寶事後才補比較表。

**修法（ch26 · LESSON 26.6，讀 DB）**：
- `*args`/`**kwargs` 一開頭加 🔑 對照表（定義時＝收/打包、呼叫時＝拆/解包），拆成 **①定義時的 `*`（收集）** 與 **②呼叫時的 `*`（攤開）** 兩段、段末互相回指，口訣「**定義＝收、呼叫＝拆**」。
- 修掉最誤導的「args/kwargs 可以自取」→ 明講「可自取的是**變數名字**、那顆**星號不能改、也不是名字的一部分**」。
- lambda 段補上綠寶對 Nami 給的講法：`def`↔`lambda` 等價對照 + `add = lambda a, b: a + b` 的逐段拆解（變數名／關鍵字／參數／回傳值自動 return）。
- 已 `import_chapters_to_db.mjs ch26` 同步、線上即時生效。

## B段：派 Agent 全課掃「同類毛病」+ 廣義教學不清 → 第一波修復

派多支 agent 掃 ch00–ch79，抓「同一符號/關鍵字不同情境意思不同卻沒說清楚、前後矛盾、文字對不上範例、術語沒白話+英中對照、程式碼壞掉」等會讓零基礎卡住的坑。**第一波已確認並修好（全部 import 進 DB、線上生效）**：

- **程式碼損壞（HTML strip 吃掉 `<...>`）**：
  - `ch32.3` Go：`if age = 18`（單等號）、`for i := 0; i  6`（`< 6; i++` 被吃掉、迴圈體亂掉）、`switch` 截斷 → 整段 if/for/switch 重寫正確。
  - （ch05/ch07/ch31/ch46 也有 generic `<T>` 被吃掉，列入第二波。）
- **同符號不同義（Nami 那一類）**：
  - `ch33.16` Rust `*` 乘法 vs 解參照、`ch33.12` `&`/`&&` 借用 vs 模式解參照。
  - `ch76.4` Angular `()` 事件綁定 vs 呼叫函式、`ch76.5` `@` 裝飾器 vs 模板控制流、`ch76.16` `$` Observable 命名慣例（vs `$event`）。
- **前後矛盾**：`ch50.7` Code Node mode（範例用 All-Items 加 isAdult，測驗卻判 Each-Item、還說 All-Items 不對）、`ch76.20` FAQ 把 NgRx 講成「舊方法」（正文說是重量級容器）、`ch38.5` 綠界 ReturnURL「可信」vs 38.2 藍新 ReturnURL「不可信」加橋接。
- **事實錯誤**：`ch78.16` `nn.RNN(..., batch_size=32)`（RNN 無此參數、會 TypeError）→ 移除+註明 batch_size 是 DataLoader 的、`ch38.1` BNPL 誤舉「買一送一」→ 改「先買後付」正確例、`ch43.2` 標題「5 個原則」實列 7 → 改「7 個原則」。
- **術語沒白話/英中對照**：`ch65.4` GEO 消歧義（地理位置優化 vs 生成式引擎優化）、`ch67.3` 補 IDOR/SSRF 定義（oneLine 有列卻內文沒解釋）。
- **比喻錯置**：`ch31.5`(fs→ESM/CJS)、`ch31.7`(Express→TypeScript)、`ch32.4`(goroutine→函數多回傳)、`ch32.6`(error→struct)、`ch16.9`(auth→queue) 各換成貼合本課主題的比喻。

**第二波（待續）**：generic `<>` 被吃掉的 ch05/07/31/46；ch34–36 大量 content 被截斷（Java/C#/PHP 課上到一半斷句）；ch49/50 n8n 啟動步驟/表格損壞；ch17/18/22/27/28/29 SQL/Mongo/Docker/pandas/scraping 的符號重載與 stale API（LINE Notify 已停）等；分批修、避免一次開太多子代理燒額度。
