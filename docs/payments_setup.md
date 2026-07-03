# 金流設定（Z幣儲值 + Pro 訂閱）

多金流商、使用者自選付款方式。課程免費；金流只用於 **Z幣儲值** 與 **Pro 訂閱**。

## 架構
- `/store`：儲值/Pro 頁（付款方式選擇器；只顯示已設定金鑰的金流商）。
- `POST /api/payments/checkout`：建單（`orders` 表）→ 依金流商回自動送出表單或跳轉。
- Webhook（真正入帳，server-to-server）：
  - 綠界 `POST /api/payments/webhook/ecpay`
  - 藍新 `POST /api/payments/webhook/newebpay`
  - Stripe `POST /api/payments/webhook/stripe`
- 入帳冪等：Z幣用 `coin_transactions.meta.order_no` 去重；Pro 延展 `subscriptions.expires_at`。
- 帳本：Z幣 `coin_transactions`（reason code 見 `src/lib/zcoin.ts`）、訂單 `orders`、訂閱 `subscriptions`。

## 需要設定的環境變數（拿到商店金鑰後填）
```
# 綠界 ECPay（申請商店審核後取得）
ECPAY_MERCHANT_ID=
ECPAY_HASH_KEY=
ECPAY_HASH_IV=

# 藍新 NewebPay（HashKey 32 碼、HashIV 16 碼）
NEWEBPAY_MERCHANT_ID=
NEWEBPAY_HASH_KEY=
NEWEBPAY_HASH_IV=

# Stripe（註冊即可）
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# 站點網址（webhook/return 用）
NEXT_PUBLIC_SITE_URL=https://ai-island-web.snowrealm.pet
# 正式金流（不設=測試機 stage 網址）
PAYMENTS_LIVE=1
```
> 只要某金流商三個金鑰沒設，`/store` 就不會顯示它（安全預設）。全部沒設 → 顯示「金流設定中」。

## 各金流商後台要設定的 URL
- 綠界：ReturnURL（付款通知）= `.../api/payments/webhook/ecpay`
- 藍新：NotifyURL = `.../api/payments/webhook/newebpay`
- Stripe：Webhook endpoint = `.../api/payments/webhook/stripe`，事件 `checkout.session.completed`，把 signing secret 填 `STRIPE_WEBHOOK_SECRET`

## 手續費（大約，簽約前以各家報價為準）
| 金流商 | 信用卡 | ATM/超商 | 月費 |
|---|---|---|---|
| 綠界 ECPay | ~2.75% | 每筆固定小額 | 標準免 |
| 藍新 NewebPay | ~2.75% | 每筆固定小額 | 依方案 |
| Stripe | 2.9%＋NT$10（國際卡+1.5%） | — | 無 |

## 定價（可改：`src/lib/payments/config.ts`）
- Z幣：1:10、越多送越多（100→1000、300→3300、500→5750、1000→12000、2000→25000）。
- Pro：月 NT$149 / 年 NT$1490。

## ⚠️ 上線前
金鑰未設前無法真的收款；串好後**務必先用測試機（stage）跑一筆**驗證簽章（綠界 CheckMacValue / 藍新 AES+SHA / Stripe 簽章）與入帳冪等，再開 `PAYMENTS_LIVE=1`。
