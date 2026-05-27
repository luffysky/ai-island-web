# AI 島 — 完整 Backlog

**版本**：v6.0 · **日期**：2026-05-28（凌晨更新）· **Owner**：雪鑰

## Sprint S1–S9 完成度

| Sprint | 內容 | 狀態 |
|---|---|---|
| **S1** 緊急 bug 修 + AI 圖實測 | 5 provider 真實 root cause 修透 | ✅ 完成 |
| **S2** alert/confirm → Toast | 全站 39 處 | ✅ 完成 |
| **S3** 後台批美化 | 69/78 頁掛 PageHero | ✅ 完成 |
| **S4** `<img>` → `<Image>` | 9 個刻意保留 | ✅ 完成 |
| **S5** Loading skeleton | 13 個 + AdminPageSkeleton | ✅ 完成 |
| **S6** Optimistic update | 21+ 處 + useOptimistic | ✅ 完成 |
| **S7** 行銷 CRUD + AI OG | Affiliate / Competitor / Ads + chapter SEO | ✅ 完成 |
| **S8** UX 細節 + Phase C | error / not-found / SW / a11y / focus-visible | ✅ 完成 |
| **S9** 新手友善化 + 內容工程 | 7 章 + bot 美化 + 學員 AI 升級 | 🟡 進行中 |

---

## 🟢 S9 新手友善化 + 內容工程

### 已完成（7 章 / 184 課新手友善化）

| 章 | 標題 | 課數 | 完成日 |
|---|---|---|---|
| **ch01** | HTML 完整 | 25（L1-L11 完成、剩 L12-L25）| 進行 11/25 |
| **ch26** | Python 基礎 | 35（含新 L0.5 終端機 + L1.5 工具）| 2026-05 ✅ |
| **ch27** | Python 資料分析 | 25 | 2026-05 ✅ |
| **ch28** | Python 爬蟲 | 25（analogy 全綠）| 2026-05 ✅ |
| **ch29** | JavaScript 爬蟲 | 25（analogy 全綠）| 2026-05 ✅ |
| **ch30** | 跨語言爬蟲 | 25（analogy 全綠）| 2026-05 ✅ |
| **ch46** | AI/ML 原理 | 25 | 2026-05 ✅ |

---

## ✅ 5/27 完成（54 commit 累計）

### Bot 三通道全面美化（LINE / Telegram / Discord）
- ✅ LINE admin bot：所有指令（follow/bind/unbind/clear/whoami）改 Flex 卡 + AI 401 醜訊息改友善卡 + `friendlyAnthropicError` 翻譯
- ✅ LINE student bot：對話歷史 DB 持久化（ai_conversations + ai_messages）+ AI 回覆 Flex 美化 + 通知 Flex（lessonComplete / achievement / forumReply）
- ✅ Telegram：/help /whoami /clear / AI 回覆 / 錯誤改 HTML 卡 + inline buttons
- ✅ Discord：全指令 + AI 回覆 / 錯誤改 rich embed + action buttons + 全 commands 改 deferred 策略（含 /help）

### 學員 LINE AI = 網站 AI 導師完整能力（方案 1+2+3）
- ✅ 方案 1：buildCourseSummary 灌入全 75 章每章 lesson 完整標題清單 + 每章超連結
- ✅ 方案 2：tool use（search_lessons / get_lesson_content / search_forum / get_forum_thread）— `askStudentAIWithTools`
- ✅ 方案 3：pgvector + match_lessons / match_forum_threads RPC + ipwho.is 風格 ai-embeddings.ts（OpenAI text-embedding-3-small）
- ✅ `/admin/ai/embeddings` 後台 + backfill API + 一鍵按鈕（**待林董按 apply backfill**）

### ch28/29/30 短 analogy 友善化
- ✅ 57 個短 analogy（< 50 字）雪鑰手寫成 80-150 字版本、跑 import_chapters_to_db 同步 DB
- ✅ 3 章全綠 25/25/25

### Zeabur build 60s 紅一片修
- ✅ chapters/[id] 移掉 generateStaticParams、改 on-demand ISR（revalidate=60）
- ✅ sitemap.ts 加 revalidate=3600 + dynamic=force-dynamic
- ✅ 7 輪檢查所有 page、TS pass

### 平台 / UI 修
- ✅ 全站 95 檔 contrast 修（淺色 text on 淺底 bg）— codemod 自動跑、`text-{c}-900 dark:text-{c}-{100/200}`
- ✅ 移除 60s 強制 getUser() 踢登出（林董抱怨「太快登出」）
- ✅ LINE Flex width 漏網（buildSimpleCard header emoji box）
- ✅ Telegram surrogate pair slice 切壞（4 層防護）
- ✅ Telegram + Discord notify retry + cause（10s timeout + retry 1 次）
- ✅ /admin/ga4「現在誰在用」區域只顯示 TW — 加 ipwho.is server side IP lookup + 24h cache
- ✅ BYOK 入口加進 /settings + TopNav 用戶 menu

### 診斷工具（給林董）
- ✅ `/admin/ai/keys/test` + UI「🧪 測 key」按鈕（驗 anthropic key 真值、區分 decrypt_failed vs 401 vs 限流）
- ✅ `/admin/notify/test` + dashboard「🧪 測 3 通道通知」按鈕
- ✅ `/admin/ai/rewrite-lessons` 後台 UI（之後其他章節短 analogy 可用）
- ✅ 自架 Piston 支援（PISTON_BASE_URL env）+ Zeabur 部署文件 `docs/piston-selfhost.md`
- ✅ Discord cold start fix doc `docs/discord-cold-start-fix.md`

---

## 🔥 林董明早立刻測（5-10 分鐘）

> 排序：先這 4 個、不到 10 分鐘確認核心工程都通

1. **`/admin/ai-keys` 按「🧪 測 key」測 anthropic**
   - 若 ✅ key 有效 → LINE admin bot 401 是其他原因（cache / wrong channel）
   - 若 ❌ decrypt_failed → AI_KEY_SECRET env 變了、刪 ai_api_keys 那 row 重貼
   - 若 ❌ 401 → key 真死了、Anthropic Console 重發

2. **`/admin` 右上按「🧪 測 3 通道通知」**
   - 看 env 設定報告（line_admin / telegram / discord 哪個缺）
   - 等 1 分鐘看 3 邊收到沒、沒收到的去 `/admin/errors` 看具體 cause

3. **重 reload `/admin/ai/embeddings`**
   - 確認按鈕文字「⚡ backfill 缺的 lessons」看得到（contrast 修了）

4. **Discord 跑 `/help`**
   - 應該秒回 embed 卡、不是「未及時回應」（全 commands 改 deferred）

---

## 🔴 林董接下來做（按優先序）

### 跑 backfill / 設定
- [ ] **`/admin/ai/embeddings` 按「⚡ backfill 全部缺的」** — 學員 LINE AI 才有 vector search 能力（~1-3 分鐘、~$0.015）
- [ ] **Zeabur env 補 `OWNER_LINE_USER_IDS=Uxxx`**（綁定後 LINE bot 直接認林董、不靠登入）
- [ ] **確認 cron-job.org `/api/cron/keep-warm` 已設 2 分鐘**（已設、Zeabur 預設 idle 5 分鐘）
- [ ] **Anthropic key 失效要重發**（看「測 key」按鈕結果決定）

### 觀察 1-2 天
- [ ] `/admin/errors` 看 notify-admin/telegram fetch failed 是否減少（retry x2 / 10s timeout / cause 細節）
- [ ] `/admin/errors` 看 LINE Flex width 是否乾淨（最後一個漏網已修）
- [ ] Discord 試 `/help` `/whoami` `/clear` 都應該 < 1 秒 OK（deferred）
- [ ] `/admin/ga4` 看「現在誰在用」區域是否顯示 TW / Taipei 而非只 TW（IP lookup）

### 內容工作 — ch01 系列
ch01 完成 11/25、剩 3 批：
- [x] L6-L11（連結 / 表格 / 表單 / SEO / JSON-LD / a11y）— 2026-05-28 ✅
- [ ] L12-L17（Web Components / PWA / SVG / 效能 / 範本）
- [ ] L18-L23（a11y 進階 / 表單進階 / meta / 結構化 / lazy）
- [ ] L24-L25（全域屬性 / 整章實戰）

### 內容工作 — 之後章節（按 P0-P6 詳見 BEGINNER_FRIENDLY_BACKLOG.md）
- P0 前端基礎：ch02 CSS / ch04 JS / ch07 共通 / ch08 React / ch10 Next
- P1 後端 + 部署：ch05 TS / ch09 Vue / ch16-22 / ch31 Node
- P2 AI 進階：ch47-50

---

## 🟡 未確認 / 待驗證（剛 push、明早看效果）

### Discord 「未及時回應」是否真的解決
**已做**：GET handler 主動預熱（ed25519 / supabase / ai-crypto）+ 全 commands 改 deferred 策略。
**待驗**：林董 Discord 跑 `/help` 看是否秒回。若仍超時、要考慮：
- 換 Edge runtime（cold start <100ms、但 supabase admin / decryptKey 要重寫成 Edge 相容）
- Zeabur 升 Always-On plan
- cron-job.org interval 縮到 1 分鐘（free tier 最低）

### Telegram fetch failed 是否真的減少
**已做**：10s timeout + retry 1 次 + cause 細節 log。
**待驗**：明早看 `/admin/errors` 數量、若還是頻繁、可能是 Zeabur 機房 → telegram.org 連線真有問題、要：
- 加更多 retry（3 次）
- 改用 Telegram 多個 endpoint round-robin
- 考慮 Cloudflare Workers 代理（邊緣到 Telegram 快）

### IP geolocation `/admin/ga4` 區域顯示
**已做**：ipwho.is fallback、24h memory cache。
**待驗**：5 分鐘後新 heartbeat 才會有 city（舊 row 仍只 TW、直到 idle 清掉）。

---

## ⚠️ 仍未做（task #24 + 林董沒授權）

### B-3 · AI OG 圖 Replicate 等儲值
- [ ] 林董去 https://replicate.com/account/billing 充 $10
- [ ] 重打 `https://ai-island-web.snowrealm.pet/api/og/ai?provider=replicate&prompt=test&model=black-forest-labs/flux-schnell&seed=1`

### B-4 · Piston 自架（task #24）
- 文件 + env 支援已寫好（`docs/piston-selfhost.md`、env `PISTON_BASE_URL`）
- 林董要實際 Zeabur 部署 piston Docker image、設 env
- 月費 NT$ 150-600

---

## 🤖 機器人功能擴充（你選做）

### F-1 · Discord + Telegram 加 admin tool use（30 分鐘）
讓 Discord / Telegram 跟 LINE admin bot 一樣會自動查 DB（已有 LINE 版本 `lib/line-ai-tools.ts`）。

學員 LINE 已有 tool use（讀網站內容）、但 admin Discord/Telegram 還沒。

### F-2 · Anthropic Skills
把「對帳 / 月報 / 故障處理」等流程包成 markdown 檔。

### F-3 · Bot persistent memory（部分完成）
- 學員 LINE bot 對話 ✅（DB-backed）
- admin LINE bot 對話 ⬜（仍 in-memory）
- Telegram / Discord ⬜（仍 in-memory）

### F-4 · LINE 通道餘額自動切換
LINE push 月度滿時、自動把通知切到 TG / Discord（log warning）。需先有 LINE quota API 查詢。

---

## 🟢 平台 / 維運

### M-1 · Zeabur build 偶爾 ECONNRESET
`.npmrc retry=10` 加好、大部分能撐過。升 plan / 改 pnpm / 鏡像 fallback 都待議。

### M-2 · LINE 通道餘額自動切換（同 F-4）

### M-3 · Telegram chat_id 拿錯時不 silent（已改）

---

## 📚 林董 blocked 待測項

| 項目 | 工時 | 內容 |
|---|---|---|
| Boss 戰實機測 | 1h | 3D 島嶼 Boss 戰流程、技能、掉落、結算 |
| 寵物實機測 | 30min | 跟隨、親密度、餵食、對話 10 句 |
| 簽到實機測 | 30min | 連續 7 天、第 7 天大禮、補簽 |
| RWD audit | 1h | Lighthouse 跑前 / 中 / 後三天 mobile score |
| Lottie 動畫挑 | 30min | 8 用途各挑一個 LottieFiles URL |
| Rich Menu PNG | 30min | 自製 2500×1686 PNG、imgur 上傳、設 env |
| GOOGLE_MAPS_API_KEY | 5min | 精準位置反查台灣縣市才準（不填用 OSM fallback） |
| 新手友善化章節驗收 | 30min | 看 ch26/27/28/29/30/46 隨機 3 課確認改寫品質 |
| `/admin/ai/embeddings` backfill | 1-3min | 按按鈕、~$0.015 |
| `/admin/ai/keys` 測 key | 30s | 確認 anthropic key 真值 |
| `/admin` 測 3 通道通知 | 30s | 確認哪個 env 缺 |

---

## 🔧 環境變數待設

```bash
# 新加 / 還沒設
OWNER_LINE_USER_IDS=Uxxx                   # 綁定後 LINE bot 直接認林董
PISTON_BASE_URL=                            # 自架 Piston 後改、預設 emkc.org
ADMIN_TELEGRAM_CHAT_ID=純數字 (用 @userinfobot 拿)
ADMIN_DISCORD_WEBHOOK_URL=                 # 通知用
NOTIFY_DUAL_USERNAMES=nami                  # Nami 雙通知
TELEGRAM_WEBHOOK_SECRET=                    # 選填、防偽 webhook

# 已停用、可從 .env.local 刪除
ADMIN_LINE_NOTIFY_TOKEN=                   # LINE Notify 2025-04 停服
```

---

## 🆕 未來規劃（v6+、不急）

### 演算法剩 2 條
- ⏳ **Chapter 推薦**（content + collaborative filter）
- ⏳ **全站語意搜尋**（embeddings + vector）— **基礎建設已有了**（embedding 跑完 backfill 即可開發 UI）

### 機器人多 bot 協作
- bot 之間能互相呼叫
- 多 admin 對話分流

### Marketing 行銷下一輪
- 排程實際接 OAuth
- AI 自動寫 weekly newsletter
- A/B 測 ad copy 真實點擊回填

---

## 📝 文件 / 維運

- [x] `docs/BACKLOG.md` v6.0（這份）
- [x] `docs/BEGINNER_FRIENDLY_BACKLOG.md`（75 章完整 audit）
- [x] `docs/daily_works_0526.md`
- [x] `docs/daily_works_0527.md`（含晚上 30 commit）
- [x] `docs/piston-selfhost.md`（自架 Piston 部署）
- [x] `docs/discord-cold-start-fix.md`（Discord 未及時回應 root cause + 修法）
- [ ] `docs/LINE_BOT_TROUBLESHOOT.md`（admin/user webhook fail 模式 + error_logs source cheat sheet）
- [ ] `docs/TELEGRAM_DISCORD_BOT_SETUP.md`（Telegram + Discord bot 完整設定流程）
- [ ] `docs/BYOK_USER_GUIDE.md`（使用者怎麼貼自己的 API key）

---

## 🚦 下一步建議（按優先序）

### 🔥 今天醒來立刻做（5-10 分鐘）
1. `/admin/ai-keys` 測 anthropic key
2. `/admin` 測 3 通道通知
3. Discord 試 `/help`
4. `/admin/ai/embeddings` 按 backfill

### 📌 本週繼續
- ch01 batch2 L6-L11
- ch01 batch3-5
- ch02 CSS 完整 25 課

### 🎮 林董 blocked 實機測（11 項一起跑）
Boss / 寵物 / 簽到 / RWD / Lottie / Rich Menu / Maps API / 章節驗收 / Embedding backfill / Test key / Test notify

### 🤖 機器人擴充
- F-1 Discord + Telegram admin tool use（30 分鐘、複用 lib/line-ai-tools）
- F-3 admin bot 對話 DB 持久化（學員的已做、admin 還沒）

---

_最後更新：2026-05-28 凌晨 by 雪鑰_
_林董去睡了、明早叫醒按 4 個按鈕測核心、其他可慢慢處理_
