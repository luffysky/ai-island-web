import { PageHero } from "@/components/admin/PageHero";
import { CreditCard } from "lucide-react";
import { PaymentsStatusClient, type ProviderStatus } from "./PaymentsStatusClient";

export const dynamic = "force-dynamic";

// 只讀「有沒有設」，永不輸出祕密值
const has = (n: string) => !!(process.env[n] && String(process.env[n]).trim());

export default function AdminPaymentsPage() {
  const live = process.env.PAYMENTS_LIVE === "1";
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet").replace(/\/$/, "");
  const usdRate = Number(process.env.MOR_USD_RATE) || 32;

  const base: Omit<ProviderStatus, "enabled">[] = [
    {
      key: "ecpay", label: "綠界 ECPay", region: "台灣", currency: "TWD",
      envs: [
        { name: "ECPAY_MERCHANT_ID", set: has("ECPAY_MERCHANT_ID") },
        { name: "ECPAY_HASH_KEY", set: has("ECPAY_HASH_KEY") },
        { name: "ECPAY_HASH_IV", set: has("ECPAY_HASH_IV") },
      ],
      webhooks: [{ label: "ReturnURL（付款結果通知）", url: `${site}/api/payments/webhook/ecpay` }],
      steps: [
        "申請身分選「個人賣家」即可（身分證＋個人銀行帳戶，地址填住家，不用店面/公司）。",
        "後台 系統開發管理 → 系統介接設定 拿 特店編號 / HashKey / HashIV。",
        "測試不用等過審：填公開測試值 MerchantID=2000132、HashKey=5294y06JbISpM5x9、HashIV=v77hoKGq4kWxNNIS，PAYMENTS_LIVE 留空。",
        "測試信用卡 4311-9522-2222-2222、月年填未過期、末三碼 222。",
        "後台把 NEXT_PUBLIC_SITE_URL 網域加進回傳網址白名單（若有此設定）。",
      ],
    },
    {
      key: "newebpay", label: "藍新 NewebPay", region: "台灣", currency: "TWD",
      envs: [
        { name: "NEWEBPAY_MERCHANT_ID", set: has("NEWEBPAY_MERCHANT_ID") },
        { name: "NEWEBPAY_HASH_KEY", set: has("NEWEBPAY_HASH_KEY") },
        { name: "NEWEBPAY_HASH_IV", set: has("NEWEBPAY_HASH_IV") },
      ],
      webhooks: [
        { label: "NotifyURL（背景入帳）", url: `${site}/api/payments/webhook/newebpay` },
        { label: "ReturnURL（前景返回）", url: `${site}/api/payments/return/newebpay` },
      ],
      steps: [
        "商店管理 → 商店資料設定 拿 商店代號；API 串接金鑰 拿 HashKey(32碼)/HashIV(16碼)。",
        "測試要用「藍新測試環境」的測試商店憑證（跟正式店不同一組），才打得動 ccore 測試機。",
        "後台把 NEXT_PUBLIC_SITE_URL 網域加進 NotifyURL/ReturnURL 授權網域。",
        "販售類別建議選「服務（線上教育/訂閱）」，據實說明站內點數 Z幣僅站內使用。",
      ],
    },
    {
      key: "stripe", label: "Stripe", region: "海外", currency: "多幣別",
      note: "⚠️ Stripe 不支援台灣註冊商家；台灣公司/個人開不了。海外收款建議改用下面的 Lemon Squeezy / Paddle。",
      envs: [
        { name: "STRIPE_SECRET_KEY", set: has("STRIPE_SECRET_KEY") },
        { name: "STRIPE_WEBHOOK_SECRET", set: has("STRIPE_WEBHOOK_SECRET"), hint: "訂閱 webhook" },
        { name: "STRIPE_STORE_WEBHOOK_SECRET", set: has("STRIPE_STORE_WEBHOOK_SECRET"), optional: true, hint: "一次性 webhook；沒設會 fallback 用上面那個" },
        { name: "STRIPE_PRICE_ID_MONTHLY", set: has("STRIPE_PRICE_ID_MONTHLY"), optional: true },
        { name: "STRIPE_PRICE_ID_YEARLY", set: has("STRIPE_PRICE_ID_YEARLY"), optional: true },
      ],
      webhooks: [
        { label: "一次性", url: `${site}/api/payments/webhook/stripe` },
        { label: "訂閱", url: `${site}/api/stripe/webhook` },
      ],
      steps: [
        "台灣多半用不到（開不了帳號）。若透過海外實體開通：Developers → API keys 拿 sk_，Webhooks 拿 whsec_。",
        "Link（link.com）：Settings → Payment methods 打開即可，code 沒鎖付款方式、會自動出現。",
      ],
    },
    {
      key: "lemonsqueezy", label: "Lemon Squeezy（MoR）", region: "海外", currency: "USD",
      envs: [
        { name: "LEMONSQUEEZY_API_KEY", set: has("LEMONSQUEEZY_API_KEY") },
        { name: "LEMONSQUEEZY_STORE_ID", set: has("LEMONSQUEEZY_STORE_ID") },
        { name: "LEMONSQUEEZY_VARIANT_ID", set: has("LEMONSQUEEZY_VARIANT_ID"), hint: "一個可自訂價的萬用 variant" },
        { name: "LEMONSQUEEZY_WEBHOOK_SECRET", set: has("LEMONSQUEEZY_WEBHOOK_SECRET") },
      ],
      webhooks: [{ label: "order_created", url: `${site}/api/payments/webhook/lemonsqueezy` }],
      steps: [
        "支援台灣賣家、當銷售方代收全球卡＋代繳稅。收 USD（MOR_USD_RATE 換算）。",
        "建 Store 拿 store id；建一個「Pay what you want」商品拿 variant id。",
        "Settings → API 建 key；Settings → Webhooks 新增指到右邊網址、勾 order_created、自設 signing secret。",
      ],
    },
    {
      key: "paddle", label: "Paddle（MoR）", region: "海外", currency: "USD",
      envs: [
        { name: "PADDLE_API_KEY", set: has("PADDLE_API_KEY") },
        { name: "PADDLE_PRODUCT_ID", set: has("PADDLE_PRODUCT_ID") },
        { name: "PADDLE_WEBHOOK_SECRET", set: has("PADDLE_WEBHOOK_SECRET") },
        { name: "PADDLE_SANDBOX", set: has("PADDLE_SANDBOX"), optional: true, hint: "測試站設 1" },
      ],
      webhooks: [{ label: "transaction.completed", url: `${site}/api/payments/webhook/paddle` }],
      steps: [
        "MoR、收 USD。Catalog 建 product 拿 product_id；Developer tools → API key。",
        "⚠️ Checkout settings 一定要設 default payment link，否則拿不到跳轉網址。",
        "Notifications 新增 destination 指到右邊網址、勾 transaction.completed、拿 secret。",
      ],
    },
  ];
  const providers: ProviderStatus[] = base.map((p) => ({ ...p, enabled: p.envs.filter((e) => !e.optional).every((e) => e.set) }));

  return (
    <div className="space-y-6">
      <PageHero
        icon={CreditCard}
        title="金流狀態 / 設定檢查"
        desc="一眼看出目前是測試機還是正式、哪幾家 provider 已設定好（會出現在 /store）、以及每家要在後台註冊的 webhook 網址。只顯示「有沒有設」、絕不外露金鑰。"
        gradient="from-emerald-500/10 via-teal-500/10 to-cyan-500/10"
        borderColor="border-emerald-500/30"
      />
      <PaymentsStatusClient live={live} site={site} usdRate={usdRate} providers={providers} />
    </div>
  );
}
