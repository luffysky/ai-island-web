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

## C段：第二波——壞碼＋矛盾硬傷（已修一批、DB 同步）

**壞碼：generic `<>` 被 HTML strip 吃光（同 ch32.3 那類）**
- **ch05（TypeScript 整章 generic）**：`<T>`/`<K,V>`/`<number>`/`Promise<T>`/`Record<K,V>`/`Repository<T>`… 共 **111 處**被吃掉、變無效 TS，全部依上下文/註解推回正確型別（含 mangled `Promise>` → `Promise<Result<T>>`、`useRef<...>` 等）。已驗 parse＋無 `&lt;` 殘留＋無重複。
  - ⚠️ ch05 還有**非 generic 的連帶損壞**（同一次 strip 把 `<…>` 之間內容吃掉）：5.5/5.18 JSX `return (...)` 被清空、5.16 掉了 strictNullChecks/strictFunctionTypes 段——需**內容重建**（另開 wave-3，不在這批）。
- **ch07 / ch31（Rust `Vec<>`/`Option<>` + TS `Promise<>`）**：子代理處理中。ch46「`result: Result`」查證為**誤報**（合法 Pydantic 型別標註、非 generic）。

**矛盾／事實錯誤（已修、DB 同步）**
- ch06.5 小測驗 `z.coerce.date()`→`z.coerce.number()`（題目是字串轉數字）
- ch17.6 `LIKE '%i'` 註解 `Nami/Robin(沒有)`→`Nami/Sanji`（Robin 結尾 n）
- ch14.2 SWR「（最佳）」→「（次要資料折衷）」與測驗一致
- ch28.6 免費 proxy「別用會偷密碼」vs「學習夠用」→ 統一為條件式
- ch28.7 主範例用已停服 LINE Notify(2025-04)→ 改 Telegram Bot 可用範例
- ch22.6 `EXPOSE #開放port`（與表格「純文件」矛盾）→ 改「只是宣告」＋補冒號 host:container vs name:tag
- ch18.15 CAP「NoSQL 通常 AP」→ 補「MongoDB 預設偏 CP、別一刀切」
- ch10.8 重點回顧/表格「force-cache(預設)」→「no-store 才是 Next15 預設」

## D段：第三波——內容重建（ch05 起）

同一次 HTML strip 除了吃 generic，也把 `<...>` 之間**整段內容/JSX**吃掉，這批要重寫（不是補括號）。已重建並同步 DB：
- **ch05 5.5**：`renderForm` state machine 的 4 個 JSX return 被清空 → 依 FormState 補回 `<EditForm/>`/`<Spinner/>`/`<SuccessMessage data={state.data}/>`/`<ErrorBanner message={state.message}/>`。
- **ch05 5.16**：strict 模式「6 個檢查」中 strictNullChecks 尾段被截、**第 2 項 noImplicitAny 整段消失**、strictFunctionTypes 標題+`type StringCallback` 行被吃 → 補回 getUser 完整範例、重寫 noImplicitAny 段、補回 strictFunctionTypes 標題與型別宣告（6 項齊全）。
- **ch05 5.18**（React+TS 實戰）：**~15 處 JSX return 全被清空**（Button/Card/Input/Form/MyInput/UserProfile/UserList/AuthProvider/ProfileButton…）→ 整課 content 重寫、每個元件補回正確 type-safe JSX（`<AuthContext.Provider value={{user,login,logout}}>`、`<input ref={inputRef}/>`、event handler `<HTMLInputElement>` 等），保留原有 prose/註解不動。

## E段：第三波 3b——塌掉迴圈/運算子 + 截斷內容重生成（7 章）

派 3 支子代理平行重建（各改不相交檔案），全部驗證（parse／`&lt;` 殘留 0／code fence 平衡／無殘留損壞簽名）後同步 DB：

- **ch07 + ch31（塌掉的迴圈/運算子，12 處 / 8 課）**：strip 從 `<` 吃到下一個 `>`，把整個迴圈體＋下一句開頭都吞掉。重建：ch07 7.4 比較/位移運算子（`< <= << >>`）、7.6 JS for-loop＋`nums.map`、7.12 分離 Ruby 繼承 vs Python 封裝、7.20 拆 Go for-loop 與 Rust thread、7.27 斷句；ch31 31.8（4 處：CPU 迴圈+Worker、worker sum、retry+backoff、p-limit 併發）、31.22 RAG insert 迴圈＋pgvector `<=>` 查詢。
- **ch34–36（截斷內容重生成，14 課）**：多課 content 斷在半句/半個 code block（連 miniQuiz 考的段落都不存在）。依各課 `outline`／`☕`／`miniQuiz` 補完到完整結尾、關閉未閉合 fence、補齊測驗要考的程式碼（如 34.5 `@Transactional` placeOrder rollback、35.3 接案「SaaS 不流行」段），並修 35.1 誇大宣稱「快一百倍」→ 條件式說法。接案/報價一律 hedged、不掛保證。⚠️ **此批屬「重生成新內容」**、非原作者原文，建議 Codex/人再 skim ch34–36。

## F段：第四波——ch27 資料科學 gloss（6 處，已修+DB 同步）

- 27.16 `effect_size=0.025` 憑空出現 → 補 `proportion_effectsize(0.05, 0.055)` 換算過程（不是直接填 0.5%）
- 27.15 `p_value < 0.05` 在 p 值教之前(L16)就用 → 補白話 gloss（0~1、越小越有把握、0.05 是慣例門檻）
- 27.21 `curse of dimensionality` → 補「維度災難」白話；`data leakage`/`cross-validation` → 補「資料洩漏/交叉驗證」白話
- 27.3 `axis` 同一個 axis=0 又叫「行」又叫「列」 → 加 row/column 英文對照＋教材約定 legend，統一不混淆
- 27.4 `df.loc[0:2]` vs `df.iloc[0:3]` 都註「第 0-2 列」卻數字差 1 → 補「loc 含結尾、iloc 不含結尾」說明

**剩餘波次（非壞碼、純 gloss/比喻，可緩）**：
- 第 5 波 符號重載 gloss：ch17.5/17.12、ch18.2、ch28.2/28.8、ch08.4/09.16/10.9、ch12.4、ch29.1
- 第 6 波 系統性比喻錯位（ch02/04/07/08/10 analogy 錯開一課，幾十課，量最大）
- 第 7 波 術語 gloss：ch23(CAP)、ch58/59、ch22、ch28.11 + 雜項(ch01.9 quiz、ch43.3 Backlog、ch22 下一課指錯)
