# AI 島 LINE 機器人功能擴充 Plan

**版本**：v1.0 · **日期**：2026-05-28 · **Owner**：雪鑰

> 目標：讓學員加 AI 島 LINE bot 覺得「物超所值」、隨時掌握學習狀況。

---

## 🛤️ 學習足跡功能（林董新加、必做）

**痛點**：程式世界太大、學到後面忘前面、需要「回看 / 複習 / 出題考試」三件套。

### E. 網站「學習足跡」頁 `/me/footprint`
- Timeline 視覺化：年 / 月 / 週 / 日切換、每天完成的 lesson 列出
- 章節進度卡：哪幾章學了多少 / 上次學的時間
- 統計圖：每週連線天數、累計 lesson、quiz 通過率趨勢
- 「複習推薦」區塊：7 / 14 / 30 / 90 天前學過、現在該複習的 lesson
- 既有 SideNav「歷程」tab 內容升級 → 簡略版指向 `/me/footprint`

### F. LINE bot 學習足跡命令
| 命令 | 功能 |
|---|---|
| `/footprint` `/足跡` | 最近 14 天每天學什麼（簡列）|
| `/history N` | 最近 N 天詳細足跡（最多 30 天）|
| `/recap` `/回顧` | AI 用足跡寫一段話「你最近學了 X / Y / Z」|
| `/review` `/複習` | 從 7+ 天前學的隨機挑 1 lesson、立刻出 quiz |
| `/forget` | 列「最該複習」（7/14/30/90 天前 quiz 通過但久沒碰）|

### G. 艾賓浩斯遺忘曲線複習排程
- cron 每天看每個學員「7 / 30 / 90 天前學過」的 lesson
- 自動排進複習隊列（`spaced_review_queue` table）
- 20:00 推播 OR `/forget` 命令觸發、3 題 quiz / 次
- Pro 解鎖：自選複習頻率（每天 / 隔天 / 每週）

---

## 🟢 本輪實作（這 commit）

### A. 筆記命令式 `/note`
- 學員打「`/note 今天學了 useState`」或「`存筆記 ...`」或「`筆記 ...`」
- bot 寫進 `notes` table（chapter_id=null 自由筆記）
- 網站側邊欄筆記頁立即看到
- 未綁定提示先去網站綁

### B. Quick Reply「📝 存筆記」按鈕
- 每則 AI 回覆下方附 Quick Reply 按鈕
- 點按 → postback `action=save_note&msg_id=<ai_messages.id>`
- bot 從 `ai_messages` 撈該訊息存進 notes
- 不用打字、一鍵存

### C. Reply 觸發（LINE 限制、暫略）
- LINE 有 `quotedMessageId` 但功能受限、UX 不如 B
- 結論：B 已涵蓋「一鍵存最近一則 AI 回覆」場景、C 暫不做

### D-bis. LINE 簡易足跡 `/footprint`
- 從 `learning_events` table 撈最近 14 天 lesson 完成事件
- 依日期分組、每天列「📅 5/27 完成 3 課：ch01.7, ch01.8, ch02.1」
- 末尾附按鈕：「看完整足跡」→ `/me/footprint`（網站版、本輪同時做基本頁面）

### D-tris. 網站 `/me/footprint` 基本頁
- Server component、讀 `learning_events`
- Timeline 列表（依日期倒序、每天分組）
- 章節 / lesson title 連結回對應 chapter page
- 高級 timeline 圖表 / 複習推薦留 v2

### D. 每日 20:00 學習回顧推播
- `/api/cron/student-daily-review/route.ts`
- cron-job.org 設 20:00 TWN UTC+8（即 12:00 UTC）
- 對「綁定 LINE + line_notify_enabled=true」學員 push：
  - 📚 今日完成 N 個 lesson
  - 📝 quiz 嘗試 N 次、平均 X 分
  - ⚠️ 弱項章節（quiz < 60 分）TOP 3
  - 💡 推薦明日 1 課（AI 從學習史挑）
  - 🔥 連續簽到 X 天

---

## 🆓 之後可加的免費功能（讓 bot 更值）

| 命令 | 功能 |
|---|---|
| `/today` | 立即查今日學習狀況（不用等 20:00）|
| `/weak` | 列自己弱項章節（quiz < 60）|
| `/streak` | 看連續簽到 + 激勵 |
| `/recommend` | AI 推薦下一課（基於弱項）|
| `/quiz` | 隨機抽 1 題複習（從歷史錯題）|
| `/lesson <關鍵字>` | 找特定 lesson 直連網站 |
| `/explain <概念>` | AI 一句話解釋（白話）|
| `/quote` | 每日勵志程式名言 |

**自動推播類（免費）：**
- 章節完成自動恭喜（trigger event）
- 連勝里程碑慶祝（7/30/100 天）
- 連勝快斷時提醒（晚 22:00 沒簽到）
- 簽到隨機抽 Z-coin（賭場心理）

---

## 💎 Pro 訂閱解鎖（付費）

1. **無限 AI 對話**（免費 10/天）
2. **每週週報** — 週一 9:00 push（上週學什麼、進步多少）
3. **每月學習報告** — 月初 push
4. **AI 個人化學習路徑** — 用 4 週學習史推薦下 4 週路徑
5. **錯題重練機制** — 自動排錯題複習（艾賓浩斯遺忘曲線）
6. **語音輸入 → AI 答** — LINE voice message → STT → AI
7. **圖片上傳 debug** — 拍程式碼錯誤、AI 分析
8. **自選推播時間 + 內容**（不只 20:00）
9. **多語回應** — 中文 / 英文 / 日文切換
10. **家長 / 老師同步推播**（家庭學習方案、家長監督）

---

## 🏆 旗艦獨享（v2+）

1. **24/7 AI 學習教練** — mentor 角色、不只答題
2. **每週 1 對 1 AI 學習 review** — 深度分析 + 規劃
3. **內測新章節權限**
4. **獨享 Discord / Slack 群組**

---

## 📊 預期效果

| 功能 | 預期影響 |
|---|---|
| A+B 筆記同步 | 學員整理筆記摩擦 ↓ 50%、留存 ↑ |
| 20:00 推播 | DAU 留存 ↑ 30-40%、晚上活躍時段觸發 |
| /quiz 複習 | quiz 嘗試次數 ↑ 2-3 倍 |
| Pro 推播時間客製 | 訂閱轉換 ↑ 15-20% |

---

## 🔧 技術設計重點

1. **notes.user_id 必綁 profile.id**：未綁 LINE 學員打 /note 提示先綁
2. **postback msg_id 用 ai_messages.id（UUID）**：LINE postback data 上限 300 char、msg_id 36 char 含字首
3. **cron 用 `x-cron-secret` 驗證**：跟 line-daily 同 pattern
4. **20:00 push 失敗 retry 1 次**：使用 line-user 共用 sendPush helper
5. **學習回顧資料來源**：`learning_state_summary` view + `user_weak_chapters` view（已存在 / Ch 19 同步）
