# 金流設定（Z幣儲值 + Pro 訂閱）

多金流商、使用者自選付款方式。課程免費；金流只用於 **Z幣儲值** 與 **Pro 訂閱**。

- 一次性付款（Z幣儲值 / 單章）：綠界 ECPay、藍新 NewebPay、Stripe 都支援。
- Pro 訂閱（每月/每年自動續扣）：目前走 **Stripe 訂閱**（`/pricing` → `/api/me/checkout`）。

---

## 架構（程式已寫好、只差金鑰與後台設定）
- `/store`：儲值/Pro 頁（付款方式選擇器；**只顯示已設定金鑰的金流商**）。
- `POST /api/payments/checkout`：建單（`orders` 表）→ 依金流商回自動送出表單或跳轉。
- Webhook（真正入帳，server-to-server，**收款以此為準、不信前端**）：
  - 綠界　`POST /api/payments/webhook/ecpay`
  - 藍新　`POST /api/payments/webhook/newebpay`（另有前景返回 `GET /api/payments/return/newebpay`）
  - Stripe 一次性　`POST /api/payments/webhook/stripe`
  - Stripe 訂閱　`POST /api/stripe/webhook`
- 入帳冪等：Z幣用 `coin_transactions.meta.order_no` 去重；Pro 延展 `subscriptions.expires_at`。
- 帳本：Z幣 `coin_transactions`、訂單 `orders`、訂閱 `subscriptions`。

---

## 一、所有環境變數（貼進 `.env.local` / Zeabur runtime env）
```bash
# ── 綠界 ECPay（一次性）──
ECPAY_MERCHANT_ID=          # 特店編號
ECPAY_HASH_KEY=             # HashKey
ECPAY_HASH_IV=             # HashIV

# ── 藍新 NewebPay（一次性）──
NEWEBPAY_MERCHANT_ID=       # 商店代號 MerchantID
NEWEBPAY_HASH_KEY=          # HashKey（32 碼）
NEWEBPAY_HASH_IV=           # HashIV（16 碼）

# ── Stripe（一次性 + 訂閱 + Link）──
STRIPE_SECRET_KEY=          # sk_test_... / sk_live_...
STRIPE_WEBHOOK_SECRET=      # whsec_...（Stripe → Webhooks 拿）
STRIPE_PRICE_ID_MONTHLY=    # price_...（Pro 月訂閱，訂閱才需要）
STRIPE_PRICE_ID_YEARLY=     # price_...（Pro 年訂閱）
STRIPE_PRICE_ID_SINGLE=     # price_...（單章，選用）

# ── 共用 ──
NEXT_PUBLIC_SITE_URL=https://ai-island-web.snowrealm.pet   # webhook/return 用；結尾不要斜線
PAYMENTS_LIVE=1            # 綠界/藍新：設 1=打正式；不設或非 1=打測試機(stage)
```
> **安全預設**：某金流商三個金鑰只要缺一，`/store` 就不顯示它。全部沒設 → 顯示「金流設定中」。所以可以一家一家慢慢開。

---

## 二、每個 env 怎麼取得（逐家步驟）

### 綠界 ECPay
1. 到 <https://www.ecpay.com.tw> 註冊「特約商店」會員（需公司/個人資料、撥款銀行帳戶）。
2. 送出商店審核 → 通過後登入 **廠商管理後台**。
3. 後台 **系統開發管理 → 系統介接設定**，取得三個值：
   - **特店編號（MerchantID）** → `ECPAY_MERCHANT_ID`
   - **HashKey** → `ECPAY_HASH_KEY`
   - **HashIV** → `ECPAY_HASH_IV`
4. **測試機（先驗證用）**：綠界公開測試值可直接填 `.env.local`（`PAYMENTS_LIVE` 不要設）：
   ```
   ECPAY_MERCHANT_ID=2000132
   ECPAY_HASH_KEY=5294y06JbISpM5x9
   ECPAY_HASH_IV=v77hoKGq4kWxNNIS
   ```
   測試刷卡卡號：`4311-9522-2222-2222`、月/年任意未過期、末三碼 `222`。

### 藍新 NewebPay（智付通）
1. 到 <https://www.newebpay.com> 註冊金流會員、建立商店、送審。
2. 通過後登入後台 **商店管理 → 商店資料設定**：拿 **商店代號（MerchantID）** → `NEWEBPAY_MERCHANT_ID`。
3. **商店管理 → API 串接金鑰**：拿 **HashKey（32 碼）** → `NEWEBPAY_HASH_KEY`、**HashIV（16 碼）** → `NEWEBPAY_HASH_IV`。
4. 測試：藍新有獨立「測試商店」帳號，流程同上（`PAYMENTS_LIVE` 不要設，程式會打 stage 網址）。

### Stripe
1. 到 <https://dashboard.stripe.com> 註冊，完成 **Activate account**（公司/負責人/銀行帳戶，才能收 live 款；未啟用只能用 test）。
2. **Developers → API keys**：
   - **Secret key**（`sk_test_...` 開發、`sk_live_...` 上線）→ `STRIPE_SECRET_KEY`
3. **Developers → Webhooks → Add endpoint**（見第三節 URL）→ 建好後點該 endpoint 拿 **Signing secret**（`whsec_...`）→ `STRIPE_WEBHOOK_SECRET`。
4. **訂閱方案的 Price ID**（只有要賣 Pro 訂閱才需要）：**Product catalog → Add product**，各建一個經常性價格：
   - Pro 月訂閱 NT$149 / 月 → 複製其 **API ID（`price_...`）** → `STRIPE_PRICE_ID_MONTHLY`
   - Pro 年訂閱 NT$1490 / 年 → `STRIPE_PRICE_ID_YEARLY`
   - （選用）單章一次性 → `STRIPE_PRICE_ID_SINGLE`
   > 這些價格要跟 `src/lib/payments/config.ts` 的 `PRO_PLANS` 金額一致。

---

## 三、各金流商「後台要手動設定」的參數

### 綠界 ECPay
- **付款方式**：後台開啟要用的（信用卡 / ATM / 超商代碼），對應 `PROVIDER_METHODS.ecpay`。
- **ReturnURL（付款結果背景通知）**：由程式每筆帶入 `.../api/payments/webhook/ecpay`（不用在後台填）。若後台有「回傳網址網域白名單」需把 `NEXT_PUBLIC_SITE_URL` 網域加進去。
- **撥款帳戶**：設定收款銀行帳號。

### 藍新 NewebPay
- **付款方式**：後台開啟 信用卡 / ATM / 超商。
- **NotifyURL / ReturnURL 網域授權**：藍新要求在商店設定授權回調網域 → 加入 `NEXT_PUBLIC_SITE_URL` 的網域。程式帶的路徑：
  - NotifyURL（背景入帳）= `.../api/payments/webhook/newebpay`
  - ReturnURL（前景返回）= `.../api/payments/return/newebpay`
- **RespondType=JSON、Version=2.0**：程式已設，後台無需改。

### Stripe（含 Link）
- **Webhook endpoints**（Developers → Webhooks → Add endpoint），依你要賣什麼各加：
  - 一次性儲值：`https://<你的網域>/api/payments/webhook/stripe`，勾事件 `checkout.session.completed`
  - Pro 訂閱：`https://<你的網域>/api/stripe/webhook`，勾事件 `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.paid`
  - ⚠️ **注意**：Stripe 每個 endpoint 各有自己的 signing secret，但程式目前**兩條路徑共用** `STRIPE_WEBHOOK_SECRET`。建議二選一：
    1. **只用一種**（例：訂閱走 Stripe、一次性儲值走綠界/藍新）→ 只註冊那一個 endpoint、填它的 secret；或
    2. 若兩個都要，需改 code 讓兩條路徑各讀一個 secret 環境變數。
- **啟用 Link（`https://stripe.com/payments/link` / `link.com`）**：**Settings → Payment methods → 打開 Link**。程式沒有寫死 `payment_method_types`，所以 Dashboard 開了 Link，Checkout 頁就會自動出現，**不用改任何 code**。
  - 幣別為 **TWD**：Link 卡片模式支援度廣，但以 Dashboard 那個 Link 開關能否打開為準（能開＝你帳號可用）。
- **locale / 幣別**：程式已設 `locale: zh-TW`、`currency: twd`，後台無需改。
- **啟用帳戶（Activate）**：沒 activate 只能收 test 款；上線要完成 KYC + 綁銀行帳戶。

---

## 四、測試 → 上線流程
1. 先用**測試金鑰**（綠界測試值 / 藍新測試商店 / Stripe `sk_test_` + test webhook）跑：
   - Z幣儲值一筆（綠界或藍新）→ 確認 `coin_transactions` 有進帳、Z幣有加、重送不重複入帳（冪等）。
   - Pro 訂閱一筆（Stripe test 卡 `4242 4242 4242 4242`）→ 確認 `subscriptions.expires_at` 有延展。
2. 驗證簽章都對（綠界 CheckMacValue / 藍新 AES+SHA / Stripe 簽章）。
3. 換成 **live 金鑰**、設 `PAYMENTS_LIVE=1`（Stripe 換 `sk_live_` + live webhook secret），到 Zeabur runtime env 更新後重部署。
4. 用小額真卡各過一筆，確認入帳與發票/撥款正常。

---

## 五、定價（要改在這裡：`src/lib/payments/config.ts`）
- Z幣：1:10、越多送越多（100→1000、300→3300、500→5750、1000→12000、2000→25000）。
- Pro：月 NT$149 / 年 NT$1490（改金額記得同步 Stripe 的 Price）。

## 手續費（大約，簽約前以各家報價為準）
| 金流商 | 信用卡 | ATM/超商 | 月費 |
|---|---|---|---|
| 綠界 ECPay | ~2.75% | 每筆固定小額 | 標準免 |
| 藍新 NewebPay | ~2.75% | 每筆固定小額 | 依方案 |
| Stripe | 2.9%＋NT$10（國際卡+1.5%） | — | 無 |

---

## ⚠️ 上線前檢查
- [ ] 金鑰填在 **Zeabur runtime env**（不是只在本機 `.env.local`）。
- [ ] `.env.local` 內含真實金鑰 → **絕不 commit**（已 gitignore）。
- [ ] Webhook endpoint 在各家後台**註冊完成**、signing secret 對得上。
- [ ] 測試機各過一筆、驗簽章 + 冪等，才開 `PAYMENTS_LIVE=1`。
- [ ] （選）要收海外卡 / 一鍵結帳 → Stripe Dashboard 開 **Link**。
