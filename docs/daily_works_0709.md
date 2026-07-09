# 工作日誌 2026-07-09（下午～晚間）

> 主題：**全站四語翻譯全數完成（零成本）+ 任意語言互譯 + 筆記系統升級 + 全站稽核**。
> 完成的用 ~~刪除線~~ 保留可見（不刪）。tsc + next build 全綠。

---

## ✅ 今日完成

### 一、翻譯系統：任意語言互譯 + 零成本 + 全數翻完
- ~~**內容翻譯後端改免費 Google（零成本）**~~ ✅ `src/lib/gtranslate.ts`（server 版）、`scripts/_lib/gtranslate.mjs`（CLI 共用）；`content-i18n.ts` 的 `translateAndCache` 從付費 AI 換成免費 Google 端點（`translate.googleapis.com/translate_a/single`、免金鑰）。**再也不吃 API 額度。**
- ~~**任意語言互譯**~~ ✅ `sl=auto` 自動偵測原文 + `guessLocale()`（免費本地偵測：諺文→ko、假名→ja、漢字→zh、拉丁→en，**比例判斷**非「出現即算」，中文夾少量外文字不會誤判）。批次翻進「原文語言以外」的語系。外國人寫的英文文章會自動補中/日/韓。
- ~~**官方課程只翻出去、不機翻成中文**~~ ✅ `localesForScope()`：chapter/lesson 一律中文原著→只翻 en/ja/ko（英文技術標題如 "Error Handling" 不機翻成中文）；blog/forum 才「翻進中文」。
- ~~**修哨兵被吃掉的 bug（重要）**~~ ✅ 舊哨兵用私有區字元 U+E000/E001 會被 Google 吃掉→ code/tag/URL 還原失敗（如「calling 13®」）。改用數學括號 `⟦N⟧`（U+27E6/27E7，實測雙向來回原樣保留）。刪掉並重翻 1484 筆污染譯文。
- ~~**修小說類 400（chunk 切不動）**~~ ✅ 整篇擠成一行沒換行的內容 URL 太長→ google 400。`chunk` 改「安全切點」細切（標點/`⟧` 邊界，絕不切在哨兵中間）。
- ~~**cron 加時間預算防 524**~~ ✅ `/api/cron/translate-content` 加 75 秒軟上限（跑到就回傳部分、下次續翻），永不撞 Cloudflare 100 秒逾時。
- ~~**每 3 小時自動翻新內容**~~ ✅ `translate-content.yml` 加 schedule；新增/改動內容（比對 hash）最多 3 小時內自動補三語。
- **翻譯進度**：blog / chapter / forum = **100%**；lesson en/ja/ko ≈ **100%**（en 顯示 99% 是因 27 個欄位原文本來就是英文、正確不翻）。PUA 殘留 = 0。
- 工具：`scripts/translate-google-free.mjs`（`<scope> <fields> [limit] [K/N分片]`）、`translate-sync-all.mjs`（掃全站補缺）、`fix-corrupted-translations.mjs`、`clean-identity-zh.mjs`。

### 二、筆記系統升級
- ~~**筆記破版修復（bug 161→162）**~~ ✅ grid/flex item 缺 `min-w-0` 導致寬內容（含 code 片段）撐破視口被 body `overflow-x:hidden` 裁掉。`NotesManager` grid item + `NoteCard` 根 + 公開牆卡片都加 `min-w-0 max-w-full`。
- ~~**知識樹可收合**~~ ✅ 標題可點收合整棵樹、記憶到 localStorage。
- ~~**知識樹 CRUD + 最多 3 層**~~ ✅ 新增／**改名**（含整個子樹連筆記 category 一起改前綴、state+DB）／刪除（空資料夾）；`a/b/c` 三層遞迴渲染。
- ~~**筆記公開牆進側邊欄**~~ ✅ `MeSidebar` 加「筆記公開牆」→ `/notes/public`。

### 三、全站稽核（API / DB / 資料表 / UI / RWD / PWA）
- ~~**DB / 資料表**~~ ✅ migrations 63/0 全過（含 content_translations、lesson_reactions、blog_article_chapter_link）。「不存在的表」查清：`users/posts/avatars` 都在 admin nami-playground 教學 Lab 的示範碼、`user_settings` 在 GDPR export 有 `safe()` 包住 → 皆非真 bug。
- ~~**RWD 全域修正**~~ ✅ `globals.css`：①`[class*=absolute]{max-width:100vw}` → `100%`（`100vw` 含捲軸寬本身製造溢出）②移除 prose 表格 `white-space:nowrap`（讓手機小表格能換行、寬表格仍靠 overflow-x 捲動）。（稽核結論：本站 RWD 全域防護其實很扎實，這兩條是主要體感破版來源。）
- ~~**PWA 離線 fallback bug**~~ ✅ `sw.js` 離線頁存在 STATIC_CACHE 但 fallback 用 PAGES_CACHE 找 → 首次離線拿不到 `/offline`。改 `caches.match()` 跨 cache 找。SW 版本 bump v19。
- ~~**/api/mentions 補實作**~~ ✅ 部落格 @提及本來是空殼（回 404 graceful）；新增 route 搜 profiles（需登入、只回 id+label+avatar、escape LIKE）。
- ~~**quests/progress 加固**~~ ✅ delta 夾 1..5 + 每分鐘上限（防前端送 `delta:9999` 秒破任務）。

---

### 四、晚間追加（bug 163~166 回報）
- ~~**筆記還是破版（bug 163→164）真正根因**~~ ✅ 之前加 `min-w-0`/`max-w-full` 沒解，因為真凶是 **grid 少了 `grid-cols-1`**：`grid sm:grid-cols-2` 在手機（單欄）沒有明確欄樣板 → 落到「隱式 `auto` 軌道」，會撐到最寬卡片的 max-content（含 code 片段）→ 卡片比視口寬、被 body `overflow-x:hidden` 裁掉（每行右緣切齊螢幕邊）。改成 `grid grid-cols-1 sm:grid-cols-2`（`minmax(0,1fr)` 受視口約束）。`NotesManager` 兩處 grid + `SortableNoteCard` wrapper 補 `min-w-0` + 公開牆 grid 一併修。
- ~~**所有輸入框可換行 + 原格式貼上（Nami 回報綠寶 AI 無法換行）**~~ ✅ 真凶：**手機鍵盤沒有 Shift 鍵**，沿用「Enter 送出／Shift+Enter 換行」→ 手機永遠無法換行，貼多行程式碼時問句跟程式黏一起。新增 `src/lib/composer.ts`（`handleEnterSubmit`：桌機 Enter 送出、手機 Enter 換行靠送出鈕；**IME 組字中不誤送**；`autoGrow` 自動長高）。套到 **綠寶 AITutorWidget、Nami AskAI、寵物 PetChatPanel、島聊 IslandChat、私訊 MessagesClient、論壇 ThreadReplies、部落格 CommentSection、社群 SocialFeed**（單行 `<input>` → 多行 `<textarea>`，textarea 天生保留貼上原格式）。搜尋框（FriendsClient）維持單行不動。
- ~~**教學內容占位偽代碼稽核（bug 165→166）**~~ ✅ 寫 `scripts/scan-placeholder-code.mjs` 掃全 60+ 章 code fence。誠實結論：**真正「複製貼上會噴錯又看不懂」的占位符只有 1 種、2 處**（`do_stuff()` / `if condition:`）——其餘 `.bar()`（matplotlib）、`foo<T>`（泛型語法教學）、`Bearer xxx`/`"xxx"` 缺 key 示範、`@types/xxx` 都是**刻意教學寫法非占位**。修 **ch26 (26.5) do-while 模擬** 改成可直接跑的 `while True + print + break` 真範例、**ch07 (7.16) 不要吞錯** 改用 `int("abc")` 真的會 ValueError。已 `import_chapters_to_db.mjs ch26 ch07` 同步進 DB（revalidate=60 即時生效）。

---

## 🔨 待辦（下次，未完成）

### 🚨 HIGH：島嶼經濟刷幣漏洞（API 稽核發現、根因＝伺服器信任前端）
- ⬜ **`/api/island/catch-fish`**：魚種由 client 給、`grant_zcoin` 不靠 reason 去重、無總量上限 → rate-limit 內仍可刷幣。
- ⬜ **`/api/island/redeem`**：兌換的資源**數量**取自 client（僅 cap 200）、不驗真實持有 → 憑空鑄幣。
- ⬜ **`/api/island/claim-achievement`、`/open-chest`**：id 由 client 給、無「真的達成」驗證（有 reason 一次性 dedup、屬有上限白拿）。
- ⬜ **送幣 fallback 非原子**：`grant_zcoin` 失敗時 `select→update` 有 lost-update 風險。
- **根治方向**：server 端持有並校驗遊戲狀態（庫存 / 釣魚 session token / 進度事件來源）再發幣。**要配合下面的 E2E/煙霧測試一起驗**。

### 🧪 測試
- ⬜ **下次：E2E 測試 + 煙霧測試（smoke test）**——關鍵流程（登入、章節、筆記 CRUD、島嶼經濟、金流、切語言、PWA 離線）自動化把關，尤其配合上面經濟漏洞修復後回歸驗證。

### DB 函式 / migration 一致性（中）
- ⬜ `ensure_daily_quests`/`claim_quest_reward` 在多個 .sql 各定義一次、欄位曾衝突（`reward_xp` vs `xp_reward`）；專案無 migration 排序框架、全散裝 .sql，套用順序錯會靜默壞掉每日任務。考慮收斂成單一真實來源。

### PWA icon 收斂（低）
- ⬜ `apple-icon.tsx`（字母 A）與 layout `apple:/logo-192.png` 重複且不一致；`icon.tsx`（字母 A）vs `/favicon.svg` favicon 多來源；maskable 用無留白 logo（Android 圓形遮罩會裁邊）。收斂 icon 體系 + 補一張含安全區的 maskable。

### 反應計數防刷（低）
- ⬜ `lessons/[id]/reactions`、`blog/.../reactions` 用 client fingerprint 去重、無 auth → 可灌讚（僅影響統計數字）。

### 其他既有待辦（延續上一棒）
- ⬜ **E 後續**：學習反應 UI（`LEARN_REACTIONS` 反應條 + 慶祝動畫，`lesson_reactions` 表已建）、自架 Noto 素材（下載 webp 進 `public/noto/`、`NOTO_BASE` 改 `/noto`）。
- ⬜ **島嶼遊戲畫布類 RWD**（IslandV0/GameHud/TouchControls 等大量 fixed/absolute + 100vw/100dvh）：靜態掃描不易判、需真機/DevTools 動態檢查。
- ⬜ **admin routes `await req.json()` 未包 catch**（十餘處）：壞 body 會噴 500 而非 4xx（僅管理員觸發、低）。

---

## 🔒 安全紅線（不變）
- `.env.local`（真金鑰）永遠不 commit；`docs/logerr.md`、`docs/note.md` 保持 untracked。
- service_role key / DB 密碼整個專案完成後再輪替。
- 不繞過被拒絕的憑證探測。

---

## 📌 一句話交辦
**四語翻譯全數完成（零成本、任意語言互譯、每 3h 自動補新內容）；筆記系統（破版/可收合/CRUD 3 層/公開牆進側欄）+ 全站稽核修正（RWD 全域 2 條、PWA 離線、cron 524、/api/mentions、quests 加固）都上。最該優先：島嶼經濟刷幣漏洞（配 E2E/煙霧測試）。tsc+build 綠。**
