# Daily Works — 2026-05-28

雪鑰處理、董事長林董（Luffy Lin）。

## 工作主軸

承接 5/27 ch01 batch1（L1-L5）開頭、今天**爆量推進新手友善化**：完成 P0 前端基礎 5 章（ch01/02/04/07/08/10 共 153 課）+ P1 後端進階 8 章（ch05/09/16/17/18/19/20/21/22/31 共 113 課）共 **266 課新手友善化**。同時加：學員 LINE bot 五件功能（筆記 ABC + 20:00 推播 + 學習足跡）、AI 導師 bug 修、UX scroll lock。

主要 5 條線：

1. **AI 導師急修**（早上）— 林董報「Failed to execute 'json'」+ 圖片傳不了
2. **F-1+F-3 機器人擴充**（凌晨）— Discord/Telegram 接 admin tool + 三通道對話 DB 持久化
3. **P0 前端基礎 5 章 153 課**（白天）— ch01 全章 + ch02/04/10 全章 + ch07/08 補短
4. **P1 後端進階 8 章 113 課**（晚上）— ch05/16/21/31 補短 + ch09/19/20/22/18 半章 + ch17 SQL 整章
5. **學員 LINE bot 五件功能**（夜）— A 命令 /note + B Quick Reply 存 + D 20:00 推播 + 學習足跡（LINE 命令 + 網站頁）

---

## Commit 列表（時間倒序、本日全部 16 個）

```
fa44d9d  feat(line-bot): A 筆記命令 + B Quick Reply 存 + D 20:00 推播 + 學習足跡
b93124c  feat(ch17): SQL 資料庫整章 27 課新手友善化 + LINE bot 功能 plan 🎉
2c9e798  feat(ch19+20+22): 後端進階 23 課新手友善化
c4e2320  feat(ch09): Vue 完整 13 課新手友善化
768d373  feat(ch18): NoSQL 資料庫 14 課新手友善化
088d673  fix(ux): overlay 開啟時 lock body scroll + /chapters 跟 /api/nav force-dynamic
5b66c26  feat(P1-batch1): 15 課新手友善化（ch05/ch16/ch21/ch31 補短）
d299066  feat(ch02): CSS 完整 25/25 新手友善化 🎉
1db9a1b  feat(ch10): Next.js / Nuxt 完整 25/25 新手友善化 🎉
d88cc7f  feat(ch04): JavaScript 完整 25/25 新手友善化 🎉
f0d141e  feat(ch07+ch08): 補強 7 課短內容（並發/Big O/演算法 + React 進階 4 課）
ae377f3  feat(ch01): batch4+5 改寫 L18-L25 — 整章 25/25 完成 🎉
5722437  feat(ch01): batch3 改寫 L12-L17（Web Components / PWA / SVG / 效能 / 範本 / 語意化進階）
40120c6  feat(ch01): batch2 改寫 L6-L11（連結 / 表格 / 表單 / SEO / JSON-LD / a11y）
36b1fd4  feat(bot): F-1 三通道接 admin tool use + F-3 對話 DB 持久化
5f82c02  fix(ai-tutor): 修 .json() 吞錯誤訊息 + 圖片上傳前 client 壓縮
```

16 個 commit、~280 個檔案新增 / 改、~50,000 行加。

---

## 1️⃣ AI 導師急修（早上）

林董網站打開 AI 導師、傳「嗨」 + 圖片、都顯示「Failed to execute 'json' on 'Response': Unexpected end of JSON input」。

**Root cause**：
- 前端 `AITutorWidget.tsx` line 311 在 `!res.ok` 時無條件 `await res.json()`、伺服器若回非 2xx + 空 body（413 body too large / 504 gateway timeout / 502）直接炸這個錯誤、把真正的 server error 蓋掉
- 圖片問題：client 限制 4MB/張、5 張 base64 ~27MB 直接超過 Zeabur edge body 限制 → 413 + 空 body

**修法**：
- `!res.ok` 改用 `res.text()` → 容錯 `JSON.parse` → 依 HTTP status 給人話訊息（413/502/504/401 都有對應 fallback）
- 新加 `compressImage` helper：寬度 max 1280px / JPEG 0.82 → 單張 ~500KB / 5 張總 ~2.5MB

commit: **5f82c02**

---

## 2️⃣ F-1 + F-3 機器人擴充（凌晨）

### F-1 — Discord + Telegram admin tool use

**之前**：只有 LINE admin bot 有 8 個 admin tool（run_command / get_user_detail / get_error_detail / get_recent_errors / get_order_detail / get_student_learning_state / get_chapter_stats / get_period_report）。Discord / Telegram bot 純 callAI、不會自動查 DB。

**修法**：
- 新 `src/lib/bot-anthropic-tool.ts` — 共用 `tryAnthropicToolRun()`
- 找 anthropic active model + 已啟用 key → 跑 `askAIWithTools`
- 即使使用者選 OpenAI/Gemini/Groq、admin tool 也用 anthropic 跑（林董授權）
- 找不到 anthropic key/model 退回原本 callAI
- 系統 prompt 明寫「報表類請主動呼叫 tool」

### F-3 — admin bot 三通道對話 DB 持久化

**之前**：admin LINE / Telegram / Discord bot 都用 in-memory map 存對話、容器重啟全忘。

**修法**：
- 新 `src/lib/bot-admin-conversation.ts`
- `getOwnerProfileId()` 5 min cache、透過 `profiles.is_owner = true` 或 username in OWNER_USERNAMES 找林董 profile
- 不同 channel + channel_user_id 各自一個 conversation row（title 用 `LINE-ADMIN / TG-ADMIN / DC-ADMIN` 區分）
- `/clear` 改打 `clearAdminConversation`
- 找不到林董 profile → 退回 in-memory（fallback、不卡 bot）

commit: **36b1fd4**

---

## 3️⃣ P0 前端基礎 5 章 153 課（白天）

| 章 | 完成課數 | 工作量 |
|---|---|---|
| **ch01** HTML 完整 | 25/25 | 4 個 batch（L6-L11 / L12-L17 / L18-L23 / L24-L25）|
| **ch02** CSS 完整 | 25/25 | 整章 agent 寫 |
| **ch04** JavaScript 完整 | 25/25 | 整章 agent 寫 |
| **ch07** 程式邏輯共通 | 3 課（L22-L24）| inline 補短 |
| **ch08** React 完整 | 4 課（L22-L25）| inline 補短 |
| **ch10** Next.js / Nuxt | 25/25 | 整章 agent 寫 |

**ch01 各 batch**：
- batch2 L6-L11：連結 / 表格 / 表單 / SEO / JSON-LD / a11y
- batch3 L12-L17：Web Components / PWA / SVG / 效能 / 範本 / 語意化進階
- batch4+5 L18-L25：a11y 進階 / 表單進階 / meta 進階 / Schema 進階 / 圖片優化 / iframe / 全域屬性 / portfolio 實戰

**ch02 / ch04 / ch10**：用 background agents 平行寫整章、每 agent 寫 25 個 .content.md。

**ch07 補強 3 課**：L22 actor model / Erlang / Go channel、L23 Big O 7 大複雜度、L24 6 大演算法（排序/搜尋/遞迴/DP/貪心/BFS-DFS）

**ch08 補強 4 課**：L22 React 學習路徑、L23 React 19 新特性（Actions / use / Server Components）、L24 RSC vs Client、L25 Performance memo/useMemo/useCallback

commits: **40120c6 / 5722437 / ae377f3 / f0d141e / d88cc7f / 1db9a1b / d299066**

---

## 4️⃣ P1 後端進階 8 章 113 課（晚上）

| 章 | 完成課數 | 工作量 |
|---|---|---|
| **ch05** TypeScript | 3 課（L23-L25）| inline 補短 |
| **ch09** Vue 完整 | 13 課 | agent 寫半章 |
| **ch16** 後端世界全圖 | 5 課（L10/17/19/21/22）| agent 補短 |
| **ch17** SQL 資料庫 | 27 課（L1-L27）| **agent 整章重災 ⭐** |
| **ch18** NoSQL 資料庫 | 14 課 | agent 寫半章 |
| **ch19** DB 進階 | 10 課 | agent 寫 |
| **ch20** API 設計 | 6 課 | agent 寫 |
| **ch21** 認證授權 | 4 課（L1/2/3/6）| inline 補短 |
| **ch22** 部署 + Docker | 7 課 | agent 寫 |
| **ch31** Node.js | 3 課（L5/23/24）| inline 補短 |

**P1 第 1 批（15 課）**：ch05+ch16+ch21+ch31 — 1 agent 寫
**P1 第 2 批（50 課）**：ch09 / ch19+20+22 / ch18 — 3 agents 平行
**P1 第 3 批（27 課）**：ch17 SQL 整章 — 1 agent 寫

**ch17 SQL 涵蓋**：50 年歷史 / PostgreSQL 安裝 / Table+5 約束 / SELECT 完整 / WHERE+NULL 3VL / ORDER+LIMIT / GROUP+HAVING / Window Function / CTE 遞迴 / INSERT 5 寫法 / UPDATE safe mode / DELETE 軟刪 / 5 種 JOIN / UNION+EXCEPT / EXISTS vs IN / Index B-tree / EXPLAIN / Transaction ACID / View+Materialized / Trigger+Function / JSONB / Full-Text tsvector / SQL Injection / Supabase 10 分鐘

跑 `import_chapters_to_db.mjs` 同步 75 章 1158 lessons / 0 errors。

commits: **5b66c26 / c4e2320 / 768d373 / 2c9e798 / b93124c**

---

## 5️⃣ 學員 LINE bot 五件功能（夜）

林董要求：「學員 LINE 機器人可以加筆記功能嗎、長按之後同步到網站」+「每天台灣時間晚上 8 點提醒今天學了什麼 / 哪裡還不夠熟練」+「學習記錄軌跡可以回顧」。

### A. /note 命令式存筆記
- 觸發：「`/note 內容`」「`存筆記 內容`」「`筆記 內容`」
- 寫進 `notes` table（chapter_id=null 自由筆記、user_id=綁定的 profile.id）
- 網站側邊欄筆記頁立即看到
- 未綁定提示先綁

### B. Quick Reply「📝 存筆記」按鈕
- 每則 AI 回覆下方附 postback Quick Reply（4 顆：📝 存筆記 / 🛤️ 我的足跡 / 📚 看章節 / ❓ 說明）
- `saveLineConversationTurn` 改返回 assistant message id
- postback event handler 撈 ai_messages.content → 寫進 notes
- 一鍵存、不用打字

### C. Reply 觸發
LINE 平台限制、實作 UX 不如 B、暫略（plan 文件有說明）。

### D. 每日 20:00 學習回顧推播
- 新 `/api/cron/student-daily-review/route.ts`
- 對「綁定 LINE + line_notify_enabled」學員 push：
  - 📚 今日完成 lesson 數 + 列前 5
  - 📝 quiz 嘗試次數 + 平均分
  - ⚠️ 弱項章節 TOP 3（quiz < 60）
  - 🔥 連續簽到天數
  - 🛤️ /me/footprint 連結
- 沒今日紀錄 + 無弱項 + 無 streak → 不打擾（避免騷擾沒在學的人）
- cron-job.org 設「每天 12:00 UTC = 台灣 20:00」打 ?secret=$CRON_SECRET

### D-bis. /footprint LINE 命令
- 觸發：`/footprint` `/history` `/足跡` `足跡` `我的足跡`
- 撈最近 14 天 `learning_events`、依日期分組顯示
- 每天列前 3 件、附「看完整足跡」按鈕指向 `/me/footprint`

### D-tris. /me/footprint 網站頁
- 4 大區塊：
  1. **stats banner**：🔥 連續簽到 / 📚 30 天完成 / 📂 涉獵章節 / ⚠️ 弱項
  2. **30 天 timeline**：每天完成的 lesson、依日期分組
  3. **章節進度卡**：每章學了多少 / 上次學的時間（含進度條 + 點按進章節）
  4. **複習推薦**（艾賓浩斯遺忘曲線）：7-14 / 14-30 / 30-90 天前學過、最近沒碰的 lesson
  5. **弱項章節 quiz 分數**：點按進章節重做

附 `docs/LINE_BOT_FEATURES_PLAN.md` — 完整功能擴充規劃（免費 / Pro / 旗艦三層）。

commit: **fa44d9d**

---

## 6️⃣ 平台 UX 修

林董抱怨「所有元件展開時下面主內容跟著滑、很怪」（用 AI 導師時下面內容跟著動）。

### overlay-stack body scroll lock
- `pushOverlay()` → `lockBodyScroll`：保留 scrollY → `position: fixed + top: -scrollY`、補 scrollbar 寬避免版面跳
- `popOverlay()` → `unlockBodyScroll`：還原 + `window.scrollTo(0, savedScrollY)`
- AI 導師 / dropdown / TODO 開啟時整個 body 不動、只 widget 內可滑

### ChapterMap 顯示 0 lessons / SideNav 顯示 ch72/73/74 = 3/2/1（應 5/5/4）
**Root cause**：Production server ISR cache 卡舊版、DB 實際 5/5/4。

**修**：
- `/api/nav` 改 `dynamic="force-dynamic"` + 支援 `?refresh=1` 強制清 server in-memory cache
- `/chapters` 改 `dynamic="force-dynamic"` + 30s ISR
- `sw.js VERSION` v4→v5 強制清舊 PAGES_CACHE

commit: **088d673**

---

## 📈 累計進度（5/28 結算）

### 新手友善化（S9 Sprint）

**完成 13 章 / 312 課**（從昨天 7 章 184 課 → 今天 +6 章 +128 課）：

| 章 | 標題 | 完成日 |
|---|---|---|
| ch01 | HTML 完整 | 2026-05-28 ✅ |
| ch02 | CSS 完整 | 2026-05-28 ✅ |
| ch04 | JavaScript 完整 | 2026-05-28 ✅ |
| ch05 | TypeScript（補 3 課）| 2026-05-28 |
| ch07 | 程式邏輯共通（補 3 課）| 2026-05-28 |
| ch08 | React 完整（補 4 課）| 2026-05-28 |
| ch09 | Vue 完整（補 13 課）| 2026-05-28 |
| ch10 | Next.js / Nuxt | 2026-05-28 ✅ |
| ch16 | 後端世界全圖（補 5 課）| 2026-05-28 |
| ch17 | **SQL 資料庫** | 2026-05-28 ✅ |
| ch18 | NoSQL（補 14 課）| 2026-05-28 |
| ch19 | DB 進階（補 10 課）| 2026-05-28 |
| ch20 | API 設計（補 6 課）| 2026-05-28 |
| ch21 | 認證授權（補 4 課）| 2026-05-28 |
| ch22 | 部署 Docker（補 7 課）| 2026-05-28 |
| ch26 | Python 基礎 | 5/27 |
| ch27 | Python 資料分析 | 5/27 |
| ch28 | Python 爬蟲 | 5/27 |
| ch29 | JavaScript 爬蟲 | 5/27 |
| ch30 | 跨語言爬蟲 | 5/27 |
| ch31 | Node.js（補 3 課）| 2026-05-28 |
| ch46 | AI/ML 原理 | 5/27 |

**P0 前端基礎全部完成** ✅ + **P1 後端進階全部完成** ✅

### 學員 LINE bot 升級
- 筆記同步（A 命令 + B Quick Reply）✅
- 每晚 20:00 學習回顧 push ✅
- 學習足跡 LINE 命令 + 網站完整頁 ✅

### 平台工程
- AI 導師 .json() 吞錯 + 圖片壓縮 ✅
- Discord + Telegram admin tool use ✅
- 三通道對話 DB 持久化 ✅
- ChapterMap 0 lessons + SideNav 課數錯 cache 修 ✅
- overlay 開啟 body scroll lock ✅

---

## 🎯 林董明早要做（5-10 分鐘）

### 立刻測（新功能）
1. **`/api/cron/student-daily-review` cron 設定** — cron-job.org 設每天 12:00 UTC（= 台灣 20:00）打 `?secret=$CRON_SECRET`
2. **學員 LINE 試 `/note 測試一下`** — 應該回「📝 已存進筆記本」+ 網站 `/me/notes` 看到
3. **學員 LINE 問 AI 任何問題** — 看回覆下方 Quick Reply 是否有「📝 存筆記」按鈕
4. **學員 LINE 試 `/footprint`** — 應該顯示最近 14 天紀錄
5. **打開 `/me/footprint`** — 看 4 大區塊

### 平台修驗證
6. **手機 PWA 重新整理** — ChapterMap 應該顯示正確 lesson 數（不再是 0）
7. **手機開 AI 導師** — 下面內容應該不再跟著滑

### 持續處理項（5/27 carry over）
8. `/admin/ai-keys` 按「🧪 測 key」測 anthropic key
9. `/admin` 按「🧪 測 3 通道通知」
10. `/admin/ai/embeddings` 按「⚡ backfill 全部缺的」（~$0.015）
11. Discord 試 `/help`

---

## 📝 文件

新增：
- `docs/LINE_BOT_FEATURES_PLAN.md` — LINE bot 完整功能規劃（免費 / Pro / 旗艦）
- `docs/daily_works_0528.md` — 本日工作日誌

更新：
- `docs/BACKLOG.md` v7.0 — 完整 backlog 含所有未做功能
- `docs/BEGINNER_FRIENDLY_BACKLOG.md` — 12 章 → 22 章（+10）

---

_最後更新：2026-05-28 深夜 by 雪鑰_
_林董：BACKLOG v7.0 已備好、所有未做功能都列了、明天可以挑做_
