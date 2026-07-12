# Stripe 訂閱付款設定

林董：「訂閱付款 — VIP 才能真的賣」(commit 接通)

## 一次性設定

### 1. 註冊 Stripe + 拿 secret key

https://dashboard.stripe.com → Developers → API keys

- **Secret key**：`sk_live_xxx`（production）/ `sk_test_xxx`（測試）
- 抓「Reveal live key」一次性顯示、馬上複製

### 2. 建 Products + Prices

https://dashboard.stripe.com/products → Add product

| Product | Price | Type | metadata |
|---|---|---|---|
| AI 島 月訂 | NT$ 299 / 月 | Recurring monthly | `plan=monthly` |
| AI 島 年訂 | NT$ 2999 / 年 | Recurring yearly | `plan=yearly` |
| AI 島 單章 | NT$ 99 | One-time | `plan=single` |

建好每個 Product 點進去看 Price object id（`price_xxx`）。

### 3. 設 Webhook

Dashboard → Developers → Webhooks → Add endpoint

**Endpoint URL**：
```
https://ai-island-web.snowrealm.pet/api/stripe/webhook
```

**Events to send**（勾選）：
```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

建好後點進去看 **Signing secret**（`whsec_xxx`）→ 拿這條設成 `STRIPE_WEBHOOK_SECRET`。

### 4. 設 Zeabur env

```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_MONTHLY=price_xxx     # 步驟 2 拿
STRIPE_PRICE_ID_YEARLY=price_xxx
STRIPE_PRICE_ID_SINGLE=price_xxx
```

Variables 補完 → Redeploy。

## 驗證流程

### 測試用 Stripe test mode

1. Dashboard 左上「View test data」開啟
2. 用 test secret key（`sk_test_xxx`）+ test price id
3. Checkout 時用 Stripe 提供的測試卡：
   ```
   卡號: 4242 4242 4242 4242
   到期: 任何未來月份
   CVC: 任何 3 位
   郵遞區號: 任何 5 位
   ```
4. 應該秒收到 webhook、看 `webhook_events` 表是否有紀錄
5. 看 `subscriptions` 表是否 `status=active`
6. 如果有綁 Discord → 應該自動拿到 VIP role

### Production 上線後

1. 自己訂 NT$ 299 月訂測試一輪
2. 確認 `webhook_events.processed_at` 有時間戳
3. 用 TG bot 跑 `/grant_premium 你的username 30` 確認 fallback 也通
4. 訂閱後一週看 `error_logs` 有沒有 webhook 失敗

## 流程圖

```
[User /pricing]
   ↓ 點「立即訂閱」
[POST /api/me/checkout { plan }]
   ↓ 建 Stripe customer（如沒）
   ↓ 建 Checkout Session
[Stripe Checkout 頁]
   ↓ user 填卡 + 付款
[Stripe webhook → /api/stripe/webhook]
   ↓ 驗 signature
   ↓ dedup (webhook_events)
   ↓ 處理 event:
       · checkout.session.completed → 一次性付款記 subscription
       · subscription.created/updated → upsert stripe_subscriptions + subscriptions
       · subscription.deleted → status=canceled
       · invoice.paid → 寫 orders 表
   ↓ 同步 Discord VIP role
   ↓ 標 processed_at
```

## Schema

- `stripe_customers`：user_id ↔ stripe_customer_id
- `stripe_subscriptions`：完整 Stripe subscription 狀態
- `webhook_events`：所有事件 log + dedup
- `subscriptions`（既有）：簡化版、其他 code 看這個判 active
- `orders`（既有）：付款紀錄、給 KPI 看
