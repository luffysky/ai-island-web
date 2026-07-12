# Daily Works — 2026-05-25 ~ 2026-05-26

雪鑰處理、董事長林董（Luffy Lin）。

## 工作主軸

兩天密集推進、80+ commit、~120 個檔案改 / 新增、26 個 SQL migration 補跑到 prod。主要 6 條線：

1. **Sprint S1–S8 全套衝完**（後台 PageHero / Toast / Loading skeleton / Optimistic / 行銷 CRUD / AI OG 圖預設 / a11y / error pages）
2. **AI 生圖 5 provider 真實 root cause 修透**（Cloudflare base64 / Together 16 倍 / Replicate 儲值 / HF router 收斂 / Pollinations）
3. **LINE bot 雙 channel 全面 debug**（admin / user webhook 簽章 / token / email 欄位 bug / maxDuration / error_logs）
4. **新增 Telegram bot + Discord bot 雙向 AI**（slash command / /model 切換 / tool use / 美化通知）
5. **通知系統 routing 改寫**（VIP / DUAL / 多通道、Nami 雙通知、其他走 TG 省 LINE 額度）
6. **DB 補表 26 個 migration**（user_line_bind / ai_usage_models / marketing / error_logs_meta 等都已同步 prod）

---

## Commit 列表（時間倒序、本週段）

```
cffb0c8  chore: 重觸發 Zeabur build (.npmrc retry=10)
2057cd9  feat(telegram): LINE bot 20+ 指令全打通 + 通知美化
afed4e5  feat(discord): bot AI 對話 + 6 個 slash commands + ed25519 驗簽
b658a64  feat(telegram): bot AI 對話 + /model 切換 + setWebhook
1fe74d3  feat(line-debug): 加 Telegram health + 真實 sendMessage 試推
3510b47  feat(notify-admin): DUAL routing — Nami 走 LINE+TG 雙通知
b411145  feat(notify-admin): VIP routing — owner/重要 kind 走 LINE 省額度
d0858a1  fix(line-webhook-user): email 欄位不存在 → 所有訊息誤判未綁定 (鬼打牆 root cause)
1cecbed  fix(line/test-push): 429 hint 改精確 (月度額度 / 瞬時)
9d9e7ab  fix(line-webhook): lineReply 失敗寫 error_logs
011124f  fix(line): runBotCommand fail 寫 error_logs
7057c2a  fix(line-webhook-user): maxDuration=60 + AI fail 寫 log
75ea13e  fix(line-webhook): admin maxDuration=60
044f565  feat(ai-health): /api/og/ai/ai-key-health public 驗解密
b00395b  chore(migrations): 補跑 26 個 sql migration 全成功
c2fc034  feat(line-webhook:admin): sig debug log
2d581fd  feat(line-webhook): sig 驗證 log + error_logs
68b1762  feat(line): /api/og/ai/line-debug 無認證 token health
128f015  fix(og/ai): 全 provider 真實 status forward (不再裸 502)
7369f8a  fix(og/ai): Cloudflare base64 解碼 + Together 16 倍尺寸
bcf786e  fix(og/ai): Replicate 402 hint 改精準 (要儲值)
31983b1  feat(line-webhook): admin bot /whoami
5076b56  fix(og/ai/debug): Cloudflare 改打 /ai/models/search
2d33516  feat(line-bot): user bot /whoami + 未綁訊息附 userId
10aacdc  feat(line-bot): user bot 加自然語言綁定引導
877db80  fix(og/ai): Replicate 真實 status + polling 50s + log
7f43ccc  chore(line): 移除 ADMIN_LINE_NOTIFY_TOKEN (LINE Notify 停服)
8f5447a  feat(line/ai): LINE AI 修 + 診斷面板 + 純 Messaging API
dd9867b  fix(og/ai): Replicate standard polling + 清光不穩 model
c055e61  feat(S8): prefers-reduced-motion 全站尊重
98cbfab  feat(S8): skip-to-content + focus-visible
02a2c85  feat(S8): error.tsx + not-found.tsx + SW 新版本 banner
5590c26  feat(S7): 廣告 ad creative CRUD (4 平台 / A-B / 狀態)
d931437  feat(S7): 競品 CRUD UI
2bc84af  feat(S7): 推薦碼 / Affiliate CRUD
80734a0  feat(S7): chapter SEO 加 5 個 AI 圖一鍵套用
a68d1ad  fix(og/ai): provider model 收斂 + 狀態徽章
4451d9d  feat(S6): 留言/論壇審核 useOptimistic
9c57052  feat(S5): 13 個 loading.tsx skeleton
ea5fec6  feat(S4): NamiPlayground img→Image
64397ca  feat(admin S3-9): 9 頁 PageHero (broadcasts/seo/lottie/og-preview...)
c3d506c  feat(admin S3-8): 行銷 8 頁 PageHero
522ee6c  feat(admin S3-7): chapters/[id] + users batch/timeline
4daae28  feat(admin S3-6): AI 6 + 治理 7 共 13 頁
caf917e  feat(admin S3-4+5): Email/內容/通知 9 頁
57a1fa0  feat(admin S3-3): LINE 5 頁
cc7b203  feat(admin S3-2): 次要 7 頁 (ga4/ab/settings/audit/...)
1339f30  feat(admin S3-1): 中度 8 頁 (db-check/kpi/cohort/churn/...)
af083c1  fix(editor): CodeEditor Emmet + snippets 補
a8d6514  feat(editor): Emmet Tab + 10 語言 snippet (Py/JS/TS/...)
4ed0ff1  fix(og/ai): 加診斷路由 + 錯誤完整 pass-through
d1faa50  fix(og/ai): 4 provider root cause 修
30fb4a6  fix(og/ai): edge→nodejs (Zeabur edge 拿不到 env)
e32706b  feat(og): AI 生圖 5 provider 統一接 + admin 介面
2e91614  feat(nami): Charts Gallery 升級 8 圖表
34e91d4  feat(og): Pollinations.ai 免費 AI 生圖
a5a4a55  feat(admin): 後台 7 熱門頁 PageHero + AdminStatCard
4ccb499  fix(og): /api/og 502 timeout
b00c915  feat: chapter 編號用 sortIndex + Sidebar 11 群組
d4ea8aa  fix: Ch16 標題沒同步
d58aa36  fix(build): LOTTIE_SLOTS 抽出 + VSCode IDE 重寫
85563b0  fix: 林董 role 回 admin + is_owner + Lottie 推薦
70a585b  feat: Lottie 設定中央頁 (8 用途 + 即時 preview)
ef9c7c9  fix: owner role 進不了後台 + Lottie helper
147b22e  feat: 林董身份識別中央化 (5 signal 驗證)
52b37f1  feat: SEO/GEO 9 大強化
b3f00bc  feat: Dashboard trend arrow + 行銷快覽 widget
1223205  feat: 行銷區塊 + sidebar 重整
cc314fd  feat: PWA manifest 活數據 + 62 link audit
d1a6e0c  feat: Nami IDE 多語言 (.py/.sql/.html/.js 分流)
da8ba35  feat: HTTP 抽章 + LINE AI 修 + AI 用途模型介面
da1c972  feat: 3 章新內容 + Nami 6 tab bug 修
4c97ded  feat(nami): Web Worker 接通 Pyodide
3541f2c  feat(nami): 真實載入進度 + 全套件預載
e8cb0c0  fix(sw): skip pyodide-worker.js
dff8714  feat(nami): CDN fallback + worker file
0cc108e  fix(nami): micropip keep_going
f347df6  fix(nami): pydantic v1 + iframe localStorage
```

---

## 已完成系統盤點

### 🚀 Sprint S1–S8 全套（藍圖原預估 67–80 hr）

| Sprint | 內容 | 狀態 |
|---|---|---|
| **S1 緊急修 + AI 圖實測** | 5 provider 真實 root cause 修透、診斷 endpoint、debug 工具 | ✅ |
| **S2 alert→Toast** | 全站 39 處（沿用、無新工作） | ✅ |
| **S3 後台美化** | 69/78 admin 頁掛 PageHero、剩 9 頁刻意保留（admin dashboard / Hint 教學頁 / [id] 詳細頁）| ✅ |
| **S4 img→Image** | NamiPlayground 頭像、剩 9 個 `<img>` 刻意保留（data URL / markdown / 任意 URL） | ✅ |
| **S5 Loading skeleton** | 13 個 loading.tsx + 共用 AdminPageSkeleton（後台 8 + 前台 4）| ✅ |
| **S6 Optimistic update** | 21+ 處皆有、留言/論壇審核 actions 升級 useOptimistic | ✅ |
| **S7 行銷 CRUD + AI OG** | Affiliate / Competitor / Ads 完整 CRUD + 3 個 API endpoint + chapter SEO 5 個 AI 圖一鍵套用 | ✅ |
| **S8 UX 細節 + Phase C** | error.tsx / not-found.tsx / admin error / SW update banner / skip-to-content / focus-visible / prefers-reduced-motion | ✅ |

### 🎨 AI 生圖 5 Provider 真實 root cause 全修

| Provider | 狀態 | 真實 root cause |
|---|---|---|
| **Pollinations** | ✅ 永遠免費 永遠通 | — |
| **Cloudflare** flux-1-schnell | ✅ 修了 | 回的是 JSON `{result:{image:base64}}`、我們之前當 PNG binary 回給瀏覽器、瀏覽器解碼失敗 → 顯示破損 icon。改成偵測 content-type 是 JSON 就 base64 解 |
| **Together** schnell-Free | ✅ 修了 | FLUX 系列要求 width/height 16 整數倍、之前 1200×630（630÷16=39.375 不是整數）→ 破圖。改成 round to 1200×624 |
| **Hugging Face** FLUX.1-schnell | ✅ 通了 | free tier (isPro:false、canPay:false) rate limit 嚴、router endpoint 改新版 |
| **Replicate** flux-schnell | ⏳ 等儲值 | token 活但 402「Insufficient credit」— Replicate 是預付儲值制、綁卡 ≠ 自動扣款、要去 billing 儲 $10 |

額外做：
- 全 provider 真實 status forward（不再裸 502 把錯誤藏起來）
- UI 加狀態徽章（✅穩 / ⚠️不穩 / 💰需付費 / ❌已下架）
- model 清單收斂到只剩可用（從 19 → 9 個）
- `/api/og/ai/debug` 公開診斷 endpoint（不消耗 quota、直接 ping 各家驗 token）
- `/api/og/ai/ai-key-health` 驗 ai_api_keys 解密真實狀況

### 📱 LINE bot 雙 channel debug + 修復

| 問題 | Root cause | 修法 |
|---|---|---|
| user bot AI 不回（鬼打牆） | `da8ba35` 加了 `select email` 但 profiles 表無 email 欄位、Supabase 拒回 → 全部誤判未綁定 | `d0858a1` 拿掉 email |
| admin bot AI / 慢指令 silent fail | 沒設 `maxDuration`、Zeabur 預設 10s 容器 kill | `75ea13e` 加 maxDuration=60 |
| 通知斷 | `notify-admin.ts` 優先 LINE Notify 但已停服、又沒 fallback | `7f43ccc` 移除 LINE Notify 路徑、純 Messaging API |
| webhook 簽章 silent reject | verify 失敗 return 401 沒 log | `2d581fd` + `c2fc034` 加 sig debug 寫 error_logs |
| reply 失敗 silent | catch 只 console.warn | `9d9e7ab` + `011124f` 寫 error_logs + 真實 LINE API status |
| user bot 找不到綁定 | 指令清單不認自然語言 | `10aacdc` 加綁定關鍵字 + `2d33516` `/whoami` 顯示 userId |
| Replicate hint 誤導 | 寫「需綁卡」但實際是「Credit 不足」 | `bcf786e` 改寫精確 |

新增診斷工具：
- `/admin/line` 加「LINE AI 診斷工具」面板（按鈕 push 測試 / 健檢）
- `/api/admin/line/ai-health` 完整鏈檢測（env / ai_models / ai_api_keys 解密）
- `/api/admin/line/test-push` 直接打 LINE push 測 channel token
- `/api/og/ai/line-debug` 公開驗 admin/user token 真實活不活（含 Telegram bot）

### 🤖 新增 Telegram bot（雙向 AI + 美化通知）

- `/api/telegram-webhook` — 收訊、AI 對話、`/model` 切換、`/clear`、`/whoami`、`/help`
- **共用 LINE bot 20+ 指令**（`/today` `/kpi` `/users` `/orders` `/churn` `/errors` `/ai-cost` 等都能在 Telegram 用）
- 每個指令自動加 inline keyboard「📊 打開後台」按鈕、一鍵跳對應頁
- **owner 白名單**（`TELEGRAM_OWNER_USER_IDS` / `TELEGRAM_OWNER_USERNAMES`）防陌生人燒 token
- 通知美化（MarkdownV2 `*粗體*` + 13 種 kind 對應後台路徑 + inline button）
- `/api/admin/telegram/setup` 一鍵 setWebhook

### 🤖 新增 Discord bot（slash commands + AI）

- `/api/discord-interactions` — Discord Interactions endpoint
- ed25519 簽章驗證（用 Node 內建 `crypto.verify`、無新 npm 依賴）
- 6 個 slash commands：`/ai <prompt>`、`/model`、`/model_set <name>`、`/clear`、`/whoami`、`/help`
- **deferred response**（3 秒回 + 後台 PATCH、處理 AI 慢回）
- owner 白名單（`DISCORD_OWNER_USER_IDS`）
- `/api/admin/discord/setup` 一鍵 PUT 6 個 slash commands

### 🔔 通知系統 routing 改寫

`lib/notify-admin.ts` 新增 routing 規則（向後相容、沒設 env 行為跟以前一樣）：

| 條件 | 走通道 |
|---|---|
| `opts.routing` 顯式 | 強制 |
| user ∈ `NOTIFY_DUAL_USERNAMES` / `NOTIFY_DUAL_USER_IDS` | ★ **LINE + Telegram 雙通知** ★ |
| user 是 owner / ∈ `NOTIFY_LINE_VIP_*` | **LINE only** |
| kind ∈ `NOTIFY_LINE_PRIORITY_KINDS`（預設 order/refund/breach/ticket/user_ticket/admin_login） | **LINE only** |
| 其他一般事件 | **Telegram only**（→ Discord → LINE fallback） |

效果：Nami 登入 LINE+TG 同步、林董 owner 重要事件走 LINE、其他一般事件全去 Telegram（無限免費）、LINE 200/月 push 額度從此用不完。

### 💾 SQL migration 補跑 26 個到 prod

5/25 早盤雪鑰自主推進時、過程加了大量 SQL migration、林董沒同步跑、晚上一次補跑。關鍵幾個：

| Migration | 影響 |
|---|---|
| `user_line_bind_migration.sql` | 補 `profiles.line_user_id` / `line_bind_code` 等欄位 — LINE 綁定流程依賴 |
| `tickets_meta_migration.sql` | 補 `tickets.meta` JSONB — LINE ticket 寫入依賴 |
| `ai_usage_models_migration.sql` | 建 `ai_usage_models` 表 — LINE bot `pickModelForUsage` 依賴 |
| `error_logs_meta_migration.sql` | 補 `error_logs.meta` — webhook sig debug 寫入依賴 |
| `canned_replies_migration.sql` | 建罐頭表 — admin CRM 用 |
| `marketing_migration.sql` | 建 `affiliate_codes` / `ad_creatives` / `competitor_snapshots` — S7 行銷 3 個 CRUD 依賴 |
| `app_settings_extend_migration.sql` | 補 settings 系統欄位 |

全部 26 個 `IF NOT EXISTS` 寫法、重跑安全。

### 🎯 編輯器升級 — Emmet + 10 語言 snippet

- 全站 CodeEditor 加 Emmet 風 Tab 展開（`li*3` Tab → 3 個 li、`!` Tab → HTML5 Doctype）
- 10 種語言 snippet（Python / JS / TS / JSX / TSX / HTML / CSS / SQL / JSON / Markdown）

### 🐍 Nami Python Playground 全套穩定

- Web Worker 接通 Pyodide、main thread 永不卡
- 真實載入進度條 + 全套件預載 + 黑底黃字 UI
- CDN fallback 機制
- micropip `keep_going=True` 防紅字
- pydantic v1（v2 在 pyodide 跑不了）
- iframe localStorage 修
- Charts Gallery 8 圖表 + 8 範例可改
- 6 大 tab bug 修
- IDE 多語言分流（.py / .sql / .html / .js）

### 🏷️ chapter 內容調整

- HTTP / REST / GraphQL 從 Ch16 抽出來變新章（Ch08a / sortIndex 排序）
- 章節編號顯示用 sortIndex（Ch72 → Ch08a）
- Sidebar 11 群組可折疊
- 章節數活數據（不再 hardcode 71、改讀 DB）

### 🆔 林董身份識別中央化

`lib/is-owner.ts` 5 種 signal 多重驗證：
1. `profile.is_owner === true`
2. `profile.role === 'owner'`
3. `username` ∈ `OWNER_USERNAMES` env
4. `id` ∈ `OWNER_USER_IDS` env
5. `lineUserId` ∈ `OWNER_LINE_USER_IDS` env

Dashboard 透明顯示 owner 識別結果、無 silent fail。

### 🎨 行銷 / Marketing 區塊補完

- `/admin/marketing` 主控台（8 模組 + 行銷思維框架）
- AI 文案產生器、UTM Builder、品牌風格庫已有
- 新加：**Affiliate CRUD**（新增 / 啟用停用 / optimistic）
- 新加：**Competitor CRUD**（新增 / 改威脅等級 / 刪除）
- 新加：**Ad creative CRUD**（4 平台 / headlines A-B / 狀態切換）

### 🎬 Lottie 動畫中央設定

- `/admin/lottie-settings`、8 個用途、即時 preview、推薦關鍵字

### 📊 Dashboard trend arrow + 行銷快覽 widget

### 🌐 PWA / SEO / GEO 強化

- PWA manifest 活數據
- 62 sidebar link audit 全通過
- SEO 9 大強化（meta 模板 / OG 圖 / hreflang / sitemap 等）
- 章節 SEO 預覽頁加 5 個 AI 圖一鍵套用

---

## 仍待辦

詳見 `docs/BACKLOG.md`。

---

## 🔑 env 變數狀態

### ✅ 已設妥

```
ADMIN_LINE_CHANNEL_TOKEN / SECRET
USER_LINE_CHANNEL_TOKEN / SECRET
ADMIN_LINE_USER_ID
NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID
NEXT_PUBLIC_LINE_CHANNEL_ID + LINE_CHANNEL_SECRET (LINE Login)
CF_ACCOUNT_ID + CF_AI_TOKEN
TOGETHER_API_KEY
HUGGINGFACE_TOKEN
REPLICATE_API_TOKEN (要去儲值)
ADMIN_TELEGRAM_BOT_TOKEN
TELEGRAM_OWNER_USER_IDS
DISCORD_APPLICATION_ID / PUBLIC_KEY / BOT_TOKEN / GUILD_ID / OWNER_USER_IDS
```

### ⏳ 建議補

```
ADMIN_TELEGRAM_CHAT_ID  — 用 @userinfobot 拿純數字
TELEGRAM_WEBHOOK_SECRET — 選填、防偽 webhook
NOTIFY_DUAL_USERNAMES   — 設 "nami"、Nami 雙通知用
NOTIFY_LINE_VIP_USERNAMES — 想加 VIP 一律走 LINE
```

### ❌ 已停用（程式移除支援）

```
ADMIN_LINE_NOTIFY_TOKEN — LINE Notify 已於 2025-04 終止、可從 .env.local 刪除
```
