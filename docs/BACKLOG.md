# AI 島 — 完整 Backlog

**版本**：v5.0 · **日期**：2026-05-26 · **Owner**：雪鑰

## Sprint S1–S8 完成度

| Sprint | 內容 | 狀態 |
|---|---|---|
| **S1** 緊急 bug 修 + AI 圖實測 | 5 provider 真實 root cause 修透、診斷 endpoint | ✅ 完成 |
| **S2** alert/confirm → Toast | 全站 39 處 | ✅ 完成 |
| **S3** 後台批美化 | 69/78 頁掛 PageHero（剩 9 頁刻意保留） | ✅ 完成 |
| **S4** `<img>` → `<Image>` | 9 個 `<img>` 刻意保留（data URL / markdown / 任意 URL）| ✅ 完成 |
| **S5** Loading skeleton | 13 個 loading.tsx + AdminPageSkeleton | ✅ 完成 |
| **S6** Optimistic update | 21+ 處 + useOptimistic | ✅ 完成 |
| **S7** 行銷 CRUD + AI OG | Affiliate / Competitor / Ads CRUD + chapter SEO AI 圖 | ✅ 完成 |
| **S8** UX 細節 + Phase C | error/not-found/SW update + a11y skip + focus-visible + reduced-motion | ✅ 完成 |

---

## 🔴 修復中（最高優先）

### B-1 · LINE admin bot AI 還沒通

**現況：** `maxDuration=60` 已 push（`75ea13e`）+ `runBotCommand` / `lineReply` 失敗都寫 `error_logs`、未來不再 silent fail。

**待做：**
- [ ] 林董 LINE 對 admin bot 傳 `/whoami`、`/today`、`你好` 三句、看哪個通哪個不通
- [ ] 失敗的去 `/admin/errors` 看新 entry（必有 log）
- [ ] 確認 LINE OA Manager → AI島-管理員 → 回應設定：
  - Auto-response messages = **OFF**（這個開著就 silent fail）
  - Greeting messages = OFF
  - Webhook = ON
- [ ] 看 manager.line.biz Insights → Messages、本月 push 用量是否滿（200/月）

### B-2 · LINE push 通知斷

**現況：** routing 已改寫（VIP / DUAL / Telegram fallback）、但 LINE 月度 200 push 額度可能已用完（推測試訊息看到 429）。

**待做：**
- [ ] 確認 manager.line.biz push 用量
- [ ] 用滿了 → 等下月 1 號 reset / 升 Premium NT$88 (500 則)
- [ ] 設 Zeabur env `NOTIFY_DUAL_USERNAMES=nami` 啟用 Nami 雙通知
- [ ] 設 `ADMIN_TELEGRAM_CHAT_ID`（用 @userinfobot 拿純數字）、設好後一般事件全走 TG 省 LINE 額度

### B-3 · AI OG 圖 Replicate 等儲值

**現況：** Cloudflare base64 / Together 16 倍 / HF router 全修妥、Pollinations 永遠通。剩 Replicate 卡儲值。

**待做：**
- [ ] 林董去 https://replicate.com/account/billing#billing → **Purchase credit** 充 $10
- [ ] 等 1–2 分鐘
- [ ] 重打：`https://ai-island-web.snowrealm.pet/api/og/ai?provider=replicate&prompt=test&model=black-forest-labs/flux-schnell&seed=1`
- [ ] 出圖 = 成功

---

## 🟡 機器人功能擴充（你選做）

### F-1 · Discord + Telegram 加 tool use（30 分鐘）

讓 Discord / Telegram 跟 LINE admin bot 一樣會自動查 DB：
```
你: 今天有沒有新訂單？
AI: [自動呼叫 run_command("orders")]
AI: 「有 3 筆、總額 NT$4500...」
```

實作：
- 共用 `lib/line-ai-tools.ts` 的 `askAIWithTools`
- Discord `/ai` + Telegram 一般訊息都改用 tool use 模式
- 3 通道對等

### F-2 · Anthropic Skills

把「對帳 / 月報 / 故障處理」等重複流程包成 markdown 檔、Claude 自動取用：

實作：
- 建 `skills/` 資料夾、每個 .md 一個 skill
- 上 Anthropic API messages 帶 `betas: ["files-api-2025-04-14"]`
- 或簡單版：把 skills 文字塞 system prompt

### F-3 · Bot persistent memory（1 小時）

跨容器重啟記住對話 + 偏好：
- 加 DB 表 `bot_conversations`、記每段對話
- 加 `bot_user_preferences`、記用戶偏好（「林董喜歡簡潔回答」）
- AI 每次回覆前讀 preferences

### F-4 · Discord 通知美化 embed 卡片

通知用 Discord rich embed（左側色條 + 標題 + 欄位 + 縮圖）：
- 要 `Embed Links` 權限（已在邀請清單）
- 改 `lib/notify-admin.ts` `sendDiscord` 用 embed 格式

---

## 🟢 平台 / 維運

### M-1 · Zeabur build 偶爾 ECONNRESET

**現況：** `.npmrc retry=10` 加好、大部分能撐過。但 Zeabur 機房當下完全連不到 npm 時還是會 fail。

**改善選項：**
- 升 Zeabur plan（更穩網路）
- 改 pnpm（容錯 + 10 倍、build 快）
- 加 npm 鏡像 fallback（淘寶 / cnpm）

### M-2 · LINE 通道餘額自動切換

當 LINE push 月度滿、自動把後續通知切到 TG / Discord（log warning）。目前是 silent fail。

```ts
// notify-admin.ts pickChannels 加：
if (lineMonthlyUsage > 180) routeTo = "telegram";
```

需先有「查 LINE 本月 push 用量」endpoint（LINE API 有 `/v2/bot/message/quota`）。

### M-3 · Telegram chat_id 拿錯時不 silent

`ADMIN_TELEGRAM_CHAT_ID` 設錯（例如貼到 URL hash）→ 通知靜默失敗。改成 sendTelegram 失敗時寫 error_logs（已部分做、檢查覆蓋率）。

---

## 📚 林董 blocked 待測項（雪鑰沒辦法跑）

| 項目 | 工時 | 內容 |
|---|---|---|
| Boss 戰實機測 | 1h | 3D 島嶼 Boss 戰流程、技能、掉落、戰後結算 |
| 寵物實機測 | 30min | 寵物跟隨、親密度、餵食、對話 10 句 |
| 簽到實機測 | 30min | 連續 7 天簽到、第 7 天大禮、補簽機制 |
| RWD audit | 1h | Lighthouse 跑前 / 中 / 後三天、看 mobile score 趨勢 |
| Lottie 動畫挑 | 30min | 8 用途各挑一個 LottieFiles URL、貼到 `/admin/lottie-settings` |
| Rich Menu PNG | 30min | 自製 2500×1686 PNG、imgur 上傳、設 `RICH_MENU_IMAGE_URL` |
| CRON_SECRET + 外部 cron | 30min | GitHub Actions / cron-job.org 觸發每日報表 |
| GOOGLE_MAPS_API_KEY | 5min | 精準位置反查台灣縣市才準（不填用 OSM fallback） |
| Discord embed 通知美化測 | 15min | 觸發小事件、確認 Discord 顯示彩條 embed |
| Telegram bot 跑 LINE 指令測 | 15min | `/today` `/users` `/orders` 在 TG 有沒帶 inline keyboard 按鈕 |

---

## 🔧 環境變數待設

```bash
# 確認 / 補設
ADMIN_TELEGRAM_CHAT_ID=純數字 (用 @userinfobot 拿)
TELEGRAM_WEBHOOK_SECRET=隨機長串 (選填、防偽 webhook)
NOTIFY_DUAL_USERNAMES=nami  ← 給 Nami 雙通知用
NOTIFY_LINE_VIP_USERNAMES=  ← 想加 VIP 一律 LINE

# 已停用、可從 .env.local 刪除
ADMIN_LINE_NOTIFY_TOKEN=  ← LINE Notify 2025-04 停服、程式已不讀
```

---

## 🆕 未來規劃（v6+、不急）

### 演算法剩 2 條

- ⏳ **Chapter 推薦**（content + collaborative filter）
- ⏳ **全站語意搜尋**（embeddings + vector）

### 機器人多 bot 協作

- bot 之間能互相呼叫（Discord bot 觸發 LINE 推、Telegram bot 觸發 Discord 等）
- 多 admin 對話分流（Nami 問報表去 TG、林董問報表回 LINE）

### Marketing 行銷下一輪

- 排程實際接 OAuth 推 FB / IG / X / Threads（目前要手動 token）
- AI 自動寫 weekly newsletter 推 email
- A/B 測 ad copy 真實點擊回填

### Telegram bot tool use

跟 F-1 同件事、3 通道對等查 DB。

---

## 📝 文件 / 維運

- [ ] `docs/BACKLOG.md` v5（這份）
- [ ] `docs/daily_works_0526.md`（已寫）
- [ ] `docs/LINE_BOT_TROUBLESHOOT.md`（值得補、把 admin/user webhook 各種 fail 模式 + error_logs source 對應表寫成 cheat sheet）
- [ ] `docs/TELEGRAM_DISCORD_BOT_SETUP.md`（合成 Telegram + Discord 兩個 bot 的完整設定流程、含 token / chat_id / OAuth URL 拿法）

---

## 🚦 下一步建議

1. **修 LINE admin bot AI**（明天測 + 看 errors、最高優先）
2. **充 Replicate $10**（解 AI OG 圖最後一塊）
3. **設 `ADMIN_TELEGRAM_CHAT_ID` + `NOTIFY_DUAL_USERNAMES=nami`**（routing 完整啟用）
4. **跑一輪林董 blocked 5 個實機測**（Boss / 寵物 / 簽到 / RWD / Lottie 挑）
5. **F-1 機器人 tool use**（3 通道對等、最有實用價值）
