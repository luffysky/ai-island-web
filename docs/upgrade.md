# AI 島 v3 — 可以升級的地方

> 2026-08-18 寫。作者讀過 `src/`、`supabase/`、`scripts/`、`tests/`
> 與既有的 `rls-audit-report.md` 之後的判斷，不是複述 README。
>
> 對照組是 `D:\SnowRealmRebirth\1page`——那邊已經實際驗證過的做法才列進來。

---

## 一、這個專案在做什麼、現在到哪裡

八個產品長在同一份程式碼裡：

```text
學習引擎    80 章 / 1200+ lessons、XP / 等級 / 連勝 / Z 幣 / hearts / Boss
AI 導師     多模型路由 + fallback + 熔斷器、BYOK、免費 quota、記憶與語意搜尋
創作者島嶼   碎片庫、演化／編織、作品血統、市集、Yjs 即時協作、工作室錢包
社群        貼文／留言／追蹤／好友／DM／動態
部落格      TipTap 3 + AI 寫作 + SEO/GEO + RSS + 訂閱
金流        三家（綠界／藍新／Stripe）、Z 幣、Pro 訂閱
後台        RBAC ERP、看板、分析
Agent 平台   技能目錄、排程、記憶、MCP、自主執行
```

**規模**：252 個頁面、474 個 API route、93 張表、151 條 policy、
16 個單元測試檔 + 4 個 e2e。

這是這八個專案裡功能密度最高的一個，而且**很多地方寫得比表面上看起來好**：
AI 路由有真的熔斷器、金流有五個測試檔（三家各一 + orders + config）、
RLS 審計腳本自己就存在。

**它的問題不是「做得不夠」，是「長得太快，有些地基沒有跟上」。**

---

## 二、最該先修的三件事

### 1. 🔴 資料庫重建不出來——224 個 SQL 檔，沒有順序，沒有套用紀錄

`supabase/` 底下有 **224 個 `.sql`**，檔名全部是描述式的
（`agent_memory_migration.sql`、`admin_kanban_migration.sql`……），
**沒有任何一個有編號前綴**。套用機制是 `scripts/run_supabase_sql.ps1`，
而它的預設清單寫死了 **7 個檔案**，其餘要靠 `-Files` 或旗標手動指定。

腳本裡**沒有任何 applied ledger**——沒有 `_migrations` 表、
沒有任何地方記錄哪一份跑過。

具體會發生什麼：

```text
換一台機器 / 開一個測試庫    無法重建。你不知道 224 份要跑哪些、按什麼順序
兩份 SQL 改同一張表          先後順序決定結果，而順序只存在於某個人的記憶裡
線上與本機不一致             沒有東西可以比對，只能靠「跑跑看有沒有噴錯」
```

⚠️ **這一條排第一，不是因為它現在會壞，是因為它讓其他每一件事都變貴。**
沒有可重建的資料庫，就寫不了對真資料庫跑的測試；
沒有那種測試，Z 幣經濟與金流的不變量就只能靠人工點。

**怎麼修（不用重寫 224 個檔）**：

```text
1. 建一張 _migrations (name text primary key, applied_at timestamptz)
2. 把 224 份**現況**視為 baseline：直接把檔名全部塞進 _migrations，
   宣告「這些都已經在線上了」。不要真的重跑
3. 從今天起，新的 SQL 一律 `YYYYMMDDNNNN_描述.sql`，
   由腳本讀 _migrations 決定跳過或執行，跑完寫回去
4. 腳本要能 `--status` 只顯示不執行
```

第 2 步是關鍵：**不要試圖回頭整理歷史。** 整理 224 份是一件永遠做不完的事，
而「從今天起有序」立刻就有價值。1page 的 `scripts/db-push.mjs` 是
一份 100 行的參考實作（自架 Supabase、走 pg-meta，不需要 supabase CLI）。

### 2. presign 做好了，但大多數上傳還是走伺服器

`/api/upload/presign` 已經存在，`/api/upload` 的註解也寫著
「大檔一律走 presign 直傳 R2，不經 server」。

**而實際的呼叫端是這樣**：

```text
走 presign（2 處）        BlogEditor 的大檔分支、lib/creator-upload.ts
走 /api/upload（8+ 處）   CreatorIslandClient ×2、NotesBackgroundPicker、
                          NotesManager、settings/BackgroundSection、
                          BlogEditor ×3
```

也就是說：**做好了一條更好的路，然後大部分人沒有走過去**。
這正是 1page 反覆踩到的第一種毛病的變形——不是「宣告了沒人用」，
是「做好了沒接完」。兩者的共同點是：不會報錯、測試照樣綠。

代價是實際的：每一支經過 `/api/upload` 的檔案都要完整讀進 Node 行程的記憶體，
在 serverless 上那是計費時間與記憶體上限；而筆記背景、
創作島的素材本來就可能是大圖或影片。

**怎麼修**：把 `putViaPresign` 抽成一個共用函式（`lib/creator-upload.ts`
已經有一半），八個呼叫端逐一換過去；然後**加一條守衛**反過來問：
`src/` 裡還有沒有任何地方 `fetch("/api/upload"`。
留著的要進具名例外並寫理由（例如「這裡真的需要伺服器端處理內容」）。

### 3. 9 張表 RLS 開著但 0 條 policy，22 條 policy 缺 WITH CHECK

`rls-audit-report.md`（2026-05-25）自己就寫了：

```text
🔴 RLS 開但 0 policy（9）   achievements、admin_events、ai_api_keys、
                            ai_usage_daily、analytics_snapshots、audit_logs、
                            broadcasts、seo_pages、seo_redirects
⚠️ FOR ALL/INSERT/UPDATE 缺 WITH CHECK（22）
```

第一組**未必是壞事**——「只有 service_role 能寫」對 `audit_logs`、
`admin_events` 來說正是對的設計。但 `achievements` 與 `seo_pages`
看起來應該有讀取端，0 policy 表示前台根本讀不到，
而那個表現是「成就頁永遠空的」。

第二組才是真的洞：**`FOR UPDATE` 少了 `WITH CHECK` 的意思是
「你可以改你看得到的那一列，改成任何值」**——包括把 `owner_id`
改成別人的、把 `role` 改成 admin。`USING` 管的是「哪些列你碰得到」，
`WITH CHECK` 管的是「改完之後長什麼樣算合法」，少一半等於只鎖了一半。

**怎麼修**：那份報告是 5 月的，先重跑一次拿到現況。然後
**9 張表逐一決定並寫下理由**（「這張只給 service_role 寫，因為它是稽核紀錄」
是一個完全合格的答案，寫下來就好），22 條缺 `WITH CHECK` 的補上。

⚠️ 補完之後**要故意改壞驗一次**：用 A 的 session 去 update B 的列，
確認真的被擋。1page 在同型的地方實測過三種組合，
發現「看起來擋住了」其實是另一個 trigger 在擋，policy 本身是空的。

---

## 三、可以從 1page 搬過去的（已經驗證過，不是想法）

```text
有 ledger 的 migration     `scripts/db-push.mjs`：讀 _migrations 決定跳過或執行，
                           支援 --status。自架 Supabase 走 pg-meta，
                           不需要 supabase CLI（你們的環境一樣）
表級接線稽核               93 張表的專案幾乎一定有孤兒表。
                           問「from("<表名>") 有沒有出現過」，一次都沒有
                           = SQL 跑了但功能沒做
「反過來問」型的守衛        不要列「A 要有 B」，要問「清單裡有沒有哪一個沒人做」。
                           上面第 2 點的 /api/upload 守衛就是這個形狀
故意改壞驗守衛              每加一個守衛就把程式改壞一次。改壞的方式要對應
                           它宣稱要擋的那件事
稽核腳本先去掉註解          比對原始碼之前先 strip comments。
                           同一個原因造成過一次假通過、一次假失敗
路由可達性檢查              474 個 API route + 252 個頁面，
                           「做完了但畫面上進不去」的機率接近 1
```

---

## 四、不建議做的事

```text
❌ 回頭整理那 224 份 SQL      永遠做不完，因此永遠不會開始。
                             把現況當 baseline，從今天起有序就好
❌ 拆 monorepo / 微服務       252 頁 474 route 看起來像該拆，但拆的前提是
                             知道邊界在哪，而現在沒有任何東西在量依賴。
                             先加 dependency-cruiser 看一個月的實際耦合，
                             再談拆。拆錯的代價比不拆大得多
❌ 追測試覆蓋率               16 個單元測試檔涵蓋的是金流與經濟——
                             那正是最該有的部分。往外擴的邊際效益遞減，
                             不如把力氣放在「對真資料庫跑的 RLS 測試」
❌ 現在動 auth 去接 SSO       見 SnowRealm-Platform 的規劃。
                             cookie 網域範圍要整個品牌一起決定
❌ 為了 hygiene 去清那 26 處  見下面「要 Luffy 自己做」的第 1 點：
   硬編的 admin slug         正確的動作是**換掉那串**，換完之後
                             硬編的舊值自然就沒有意義了
```

---

## 五、⚠️ 要 Luffy 自己做的兩件事

### 1. 後台密路徑 `Ak83QDhUOVqx` 要換掉

`docs/todo/REPORTS_TODO_2026-06-03.md` 裡寫著「prod env 已設
`Ak83QDhUOVqx`、fallback 永不觸發、**非實際洩漏**」。

**那個判斷只涵蓋了「fallback 會不會被觸發」，沒有涵蓋「那串字有沒有被看到」。**
它曾經出現在公開的 `robots.txt` 與每位訪客都會載入的根版面 JS chunk 裡。
一旦被看到過，改程式碼救不回來——只能換一串。

換的動作要你自己做（改 env、重新部署）。`pnpm gen:slug`
（1page 那邊的腳本，可以照抄）產得出新的。

順帶：換完之後加一條守衛——**首頁 HTML 與 JS chunk 裡不得出現密路徑**。
1page 有一條 `admin-security.spec.ts` 在做這件事，抓得到的正是這種洩漏。

### 2. RLS 審計報告重跑

`rls-audit-report.md` 是 2026-05-25 的，之後又長了 agent 平台那一整塊。
重跑一次才知道現況。

---

## 六、順序

```text
第一步   _migrations ledger + baseline（不重跑歷史）
第二步   換掉密路徑，並加一條「密路徑不進 bundle」的守衛
第三步   重跑 RLS 審計，9 張表逐一寫下決定，22 條補 WITH CHECK，
         補完故意改壞驗一次
第四步   八個 /api/upload 呼叫端換成 presign，加一條反過來問的守衛
之後     表級接線稽核、路由可達性、dependency-cruiser
```

第一步是其他每一步的前提：沒有可重建的資料庫，
第三步那種「對真的資料庫跑」的測試就寫不出來。
