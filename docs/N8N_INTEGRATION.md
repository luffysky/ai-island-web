# AI 島 × N8N 整合 spec

> 林董：「N8N 整合 spec 討論」
> BACKLOG 12 個 workflow 規劃在這裡落地。

## 架構決策

| 選項 | 描述 | 月費 | 適合 |
|---|---|---|---|
| **A. n8n Cloud** | 官方 SaaS | $20/月 起 | 不想自架、無限工作流 |
| **B. n8n self-host Docker** | 自架 Zeabur 一台 service | ~$5/月 | ⭐ **林董優先**、省 75% |
| C. zapier / make.com | 商業替代 | $20-50/月 | 太貴、放棄 |

**推薦 B**：Zeabur 一台 Docker container、`n8nio/n8n:latest`、~$5/月、無限 workflow + webhook + cron。

## AI 島端要先有的 hooks

### Inbound（n8n → AI 島）— 用 admin API key 拉資料

需要建：

```
GET  /api/admin/api/users           ?role=premium&limit=100
GET  /api/admin/api/kpi/today
GET  /api/admin/api/orders          ?since=2026-05-01
POST /api/admin/api/broadcast       { channel, audience, content }
POST /api/admin/api/grant-premium   { user_id, days }
```

授權：header `Authorization: Bearer ${N8N_API_KEY}`

### Outbound（AI 島 → n8n）— webhook fire

事件源在 AI 島內已有的：
- 用戶完課 → fire `lesson_completed` webhook
- 訂閱成功 → fire `subscription_started` webhook
- 7 天沒登入 → fire `user_at_risk` webhook
- 註冊完 → fire `user_registered` webhook

需要建：

```
src/lib/n8n-outbound.ts
  fireN8nWebhook(event_type, payload) — 從 app_settings 讀 n8n webhook URL
```

env：
```
N8N_INBOUND_API_KEY=  # n8n 拉資料用
N8N_OUTBOUND_URL_PREFIX=https://n8n.snowrealm.pet/webhook  # AI 島往外推
```

## 12 workflow（按 ROI 排）

### N1: 學員 onboarding 7 天序列 🔥

| Step | When | What |
|---|---|---|
| 1 | 註冊後立即 | 歡迎 email + LINE「綁定 LINE 拿 50 z-coin」 |
| 2 | 第 24h | 「還沒開始第一課？這 3 課最入門」 |
| 3 | 第 3 天 | 進度 < 3 lesson → 「跟不上沒關係、雪鑰陪你」 |
| 4 | 第 7 天 | 全 user → 「7 天回顧、解鎖月訂優惠 NT$ 199」 |

n8n 觸發：cron 每天 03:00 跑、查 `profiles.created_at`。

### N2: 流失 winback

每天掃 `last_active_at` < 7/14/30 天的 active subscription、AI 客製化挽回：

```
n8n flow:
  1. GET /api/admin/api/users?at_risk_days=7
  2. for each user:
     2.1 GET /api/admin/api/user-learning-state/{id}
     2.2 AI node: 用 user 的弱項 + 興趣寫一段挽回訊息
     2.3 推 LINE / TG / Email 三選一
```

### N3: AI 內容工廠

寫一篇 blog 觸發 webhook → AI 拆解 → 自動發：
- Threads 摘要（< 500 字）
- IG 9 張卡片
- YouTube 短影片腳本
- LINE bot push 預告

### N4: 每天 09:00 KPI 摘要 → LINE 自己

```
n8n cron: 每天 09:00
  → GET /api/admin/api/kpi/today
  → AI 一句摘要（30 字內）
  → LINE push 給林董
  → Discord 推一張 KPI 卡到 #admin
```

### N5: 章節自動發佈 pipeline

寫好 ch json → push 到 GitHub → n8n watch repo →
- 跑 import_chapters_to_db.mjs
- 觸發 OG 圖生成
- LINE 發布通知

### N6: AI 工作流路由

複雜任務 → Claude；簡單 → GPT-mini；批次 → Groq Llama。
省 token cost 50%+。實作位置：n8n function node + AI 島 `callAI` 函式。

### N7: 集中通知中心

重要事件 → fan-out 到 LINE + Discord + Slack + Email 四通道。
取代現在每處 hardcode 推送 logic。

### N8: 客服工單 AI 分流

LINE / Discord 收訊 → n8n AI node 分類：
- bug → 派 admin Discord
- 學習問題 → AI 直接回
- 退費 → 派人工

### N9: Stripe webhook → Supabase（部分）

可選：Stripe webhook 也接 n8n、做更複雜的 data routing。
（AI 島自己的 webhook 已 work、n8n 補強用）

### N10: 每日 03:00 backup

n8n cron → `pg_dump` Supabase → 上傳 R2/S3 → 留 30 天輪替。

### N11: 異常偵測 + alert

監控 5 個指標：
- 流量突增（每分鐘 visit > 平均 + 3 SD）
- API error rate > 5%
- AI cost spike（單日 > $10）
- 註冊降為 0（cron 出問題了）
- DB CPU > 80%

→ 觸發 LINE + Discord + Email 三通道 alert。

### N12: GitHub release → 站內 changelog

`git tag v7.1 push` → GitHub webhook → n8n →
- 抓 CHANGELOG.md 自上次 tag 後的 diff
- 寫進 `app_settings.changelog`
- LINE broadcast「v7.1 上線、更新內容…」

## 開工順序

1. **架 n8n self-host**（Zeabur 一台 Docker、~30 min）
2. **AI 島補 admin API endpoints**（4-6 hr、所有 n8n flow 共用）
3. **第 1 個 workflow：N1 onboarding 7 天**（最容易看到效果、1-2 hr 設定）
4. **第 2 個：N4 KPI 報表**（每天有感、30 min 設）
5. **第 3+：N2 winback / N8 客服 / N6 AI 路由**

## 安全

- N8N_INBOUND_API_KEY 限 admin 後台才看得到、env-only
- n8n webhook URL 不公開、放 admin 設定頁
- n8n container 開 basic auth + HTTPS、不要裸露 5678 port
