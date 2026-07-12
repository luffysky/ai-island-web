# Daily Works — 2026-06-08

董事長林董（Luffy Lin）。雪鑰值班。
主題：**綠寶桌面停靠側欄（Notion 式推開教材）+ 手機 dvh 絲滑 → Ch26 git 細節補充 → DB 審計「接錯表」全修（純改 code 不動 DB）→ AI 模型清單載入重試 → 明亮/暗色全站對比審計 → Gemini 429 診斷 → Ch26 教學圖 18 張重匯**。

---

## 🟢 綠寶 AI 導師 — 桌面停靠 + 手機絲滑
- **桌面（≥1024px）停靠側欄**：打開綠寶改「貼右側滿版側欄」，並用 `body { padding-right }` 把整個頁面（含 sticky 頂欄）往左推 → 教材不再被聊天室擋（Notion AI 那種推開效果）。寬度可拖 320~520px、記憶；放大畫面只要還算桌面寬就持續推。
- **手機維持浮動卡片、只調順**（依林董選擇）：
  - 高度 `vh` → **`dvh`**（動態視口）：手機網址列收合 / 鍵盤彈出時卡片即時跟著縮、不再被頂出畫面或超出螢幕（這是手機卡卡主因）。
  - 滑入動畫加長 + `will-change` GPU 合成、尊重 `prefers-reduced-motion`；最小高 420→360（短螢幕不溢出）。
- **寵物聊天室**也一起套 `dvh`（同樣問題）。

## 📘 Ch26 教學補充
- 終端機課 `git config` 段：補「**要分兩行打**：第一行 Enter 送出、再貼第二行再 Enter，別黏成一行」。
- `uv init` 段：補 ⚠️「**沒裝 Git 就不會生 .gitignore**（uv 偵測到有 Git 才會 git init + 建 .gitignore，沒裝也不報錯、容易以為壞了）」＋ Windows（git-scm.com）/ Mac（`brew install git`）裝法。
- 內容存 `src/data/chapters/ch26.json`（網站直接 import、改了就生效）。

## 🧱 DB 審計 — 「接錯表」全修（純改 code、零 DB 風險）
審計工具掃完：**欄位錯接 0**。原以為「缺 6 張表」，深查後發現**多數是接到不存在表的名字、真表早就在**——建空表反而會切割資料、功能照樣壞。一律改成接既有正確表：
- `active_sessions` → **`analytics_sessions`**（admin 健康頁「30 分活躍」數字會出來了）。
- `email_subscribers` → **`email_subscriptions`**（admin 行銷訂閱數，算 newsletter 且未退訂）。
- `feature_flags` → **`app_settings`**（死碼！maintenance_mode 真相一直在 app_settings；LINE `/maint` 砍掉多餘後援、`/feature` 改寫進 app_settings）。
- `ai_usage_logs` → **`ai_usage_daily`**（LINE `/aicost` 依 provider 統計 + 真實 cost_usd）。
- `courses` → **`DUNGEONS` 靜態**（island 副本清單，跟 `/courses` 副本頁一致、不必建表）。
- 剩 `avatars`/`posts`/`users`/`user_settings`：nami-playground 教學沙盒 + 章節示範碼 + GDPR 的 `safe()` 包住，非 bug。

## ⚡ AI 導師 — 模型清單載入重試
- 症狀：下拉只剩「🤖 Auto」、報「AI 模型清單載入失敗」。
- 主因實測：`ai_models` 表健康（7 列全 active、RLS public 讀得到），但 **Supabase REST 回應慢到 45 秒**（HTTP 200），瀏覽器等不到就失敗。
- 修：模型清單載入**失敗重試 3 次（遞增 backoff）**再放棄 → Supabase 慢回應時不會再只剩 Auto。

## 🎨 明亮/暗色 — 全站對比審計
- **聊天室使用者泡泡黑字看不到**（明亮模式）：泡泡用漸層 `from-accent→to-accent-2`（明亮 = 深綠 #1f883d → 藍 #218bff），配 `text-black` 在深底上看不到。原本 light 覆寫只蓋實心 `.bg-accent`、漏掉漸層 → globals 補 `[class*="from-accent"]` 的 text-black/text-fg 轉白字（一條蓋全站聊天室 + 升級泡泡 XpToast）。
- **`prose-invert` 無條件**（強制淺字）→ 明亮模式淺字配淺底看不到：履歷預覽 ResumeClient、後台 NotebookTab 改 `dark:prose-invert`（只暗色反相）。
- **全站靜態掃描確認乾淨**：主題色面（bg-bg/card）沒有寫死 text-white/black（唯一 print:text-black 是列印用、正確）；沒有深灰字漏 dark:（暗色看不到）；沒有淺灰/半透明白字漏 dark:（亮色看不到）；沒有未主題化 bg-white；後台 9 處 `bg-accent + text-white` 是 admin 深色 accent（粉/深綠）、白字兩模式都 OK。

## 🔴 Gemini 429 — 診斷（未動模型）
- 報錯 `limit: 0`：**不是用量用光、是配額本身 = 0**（免費層沒綁有效帳單就是 0）。
- 林董補綁帳單後，實測 decrypt `ai_api_keys` 的 google key 直打 Gemini API → 錯誤變成 **「prepayment credits depleted」**：帳單已認出、但這是**預付制、餘額 0**，要去 [ai.studio/projects](https://ai.studio/projects) **儲值 prepaid credits** 才有 quota。
- 先**不關 Gemini**（依林董要保留其他模型給人選；Auto 仍有 Claude×2 / GPT×2 / Llama 可走）。

## 🖼️ Ch26 教學圖
- 林董重做 ch26 教學圖 **18 張（9 組深淺色）全換**，分批推上（先前 4 張 dark + 本日 14 張 + 重匯 8 張）。
- 釐清一次「git 沒跟到？」：git 比的是**內容雜湊**，檔名同內容異一定抓得到；當時沒列出的 4 張是因為內容與 repo 一致（已先推過）。

---

# 📋 待辦 / 提醒（✅=完成）

## 要林董手動處理
- **Gemini 儲值**：ai.studio → 專案 → Billing → 加值 prepaid credits（不然 Gemini 持續 429；想先止血可叫雪鑰把 2 列 Gemini `is_active=false`）。
- **Supabase 45 秒慢回應**：模型清單重試能擋大部分「只剩 Auto」，但根因是實例回應太慢 → 看 Supabase 後台算力 / 方案是否被吃滿（code 改不了）。

## 可選補強
- `user_settings` 表沒建（只 GDPR export 讀、已 `safe()` 包、不會壞）：要完整 GDPR 匯出可補建一張。
- 明亮/暗色：靜態系統性問題已清；建議實機切兩模式快速滑前台主要頁 + 後台 dashboard，視覺細節（圖片對比、hover state）有突兀再精準補。

---

## 📦 本日 commit
`16d1a9f` 桌面停靠側欄 + 手機 dvh + Ch26 git 細節 ·
`3e18678` 寵物聊天室 dvh ·
`a0a9122` 接錯表改接既有正確表 + 模型清單載入重試 ·
`4feaa66` 明亮模式聊天泡泡黑字改白字 ·
`b8dc941` prose-invert → dark:prose-invert ·
`244e925` / `3838143` Ch26 教學圖更新（14 + 8 張）。
