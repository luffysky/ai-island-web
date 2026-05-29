// 一次性建好 AI 島的 3 個 Stripe Product + Price
// 跑：先把 STRIPE_SECRET_KEY 加進 .env.local、然後 node scripts/_oneshot-stripe-bootstrap.mjs
//
// 結果：印出 3 個 price_id、直接貼到 .env.local + Zeabur env
//   STRIPE_PRICE_ID_MONTHLY=price_xxx
//   STRIPE_PRICE_ID_YEARLY=price_xxx
//   STRIPE_PRICE_ID_SINGLE=price_xxx
//
// 重複跑安全：用 product metadata.ai_island_sku 找已存在的、不會重複建

import { readFileSync, existsSync } from "node:fs";
import Stripe from "stripe";

function loadEnv() {
  if (!existsSync(".env.local")) {
    console.error("❌ .env.local 不存在");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv();
const key = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("❌ STRIPE_SECRET_KEY 沒設");
  console.error("");
  console.error("步驟：");
  console.error("1. 開 https://dashboard.stripe.com/apikeys");
  console.error("2. 點「Reveal live key」（測試先用 Reveal test key）");
  console.error("3. 把 sk_xxx 那串貼到 .env.local：");
  console.error("   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx");
  console.error("4. 重跑這個 script");
  process.exit(1);
}

const mode = key.startsWith("sk_live_") ? "🔴 LIVE" : key.startsWith("sk_test_") ? "🟢 TEST" : "❓ unknown";
console.log(`📡 Stripe mode: ${mode}\n`);

const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });

const PLANS = [
  {
    sku: "ai_island_monthly",
    name: "AI 島 · 月訂",
    description: "75 章完整課程 + 無限 AI 對話 + 寵物升級 + VIP Discord role",
    amount: 29900,          // NT$ 299 = 29900 cents (Stripe 用最小單位)
    currency: "twd",
    interval: "month",
    metadata: { plan: "monthly", env_var: "STRIPE_PRICE_ID_MONTHLY" },
  },
  {
    sku: "ai_island_yearly",
    name: "AI 島 · 年訂（省 16%）",
    description: "75 章 + 1000 z 幣 + VIP 寵物 + 優先客服 + 學習路徑客製化",
    amount: 299900,         // NT$ 2999
    currency: "twd",
    interval: "year",
    metadata: { plan: "yearly", env_var: "STRIPE_PRICE_ID_YEARLY" },
  },
  {
    sku: "ai_island_single",
    name: "AI 島 · 單章購買",
    description: "單買一章（永久解鎖該章節 + 該章所有 lesson）",
    amount: 9900,           // NT$ 99
    currency: "twd",
    interval: null,         // one-time
    metadata: { plan: "single", env_var: "STRIPE_PRICE_ID_SINGLE" },
  },
];

const results = {};

for (const p of PLANS) {
  process.stdout.write(`▶️  ${p.name} ...`);

  // 找已存在的 product
  const existingList = await stripe.products.search({
    query: `metadata['ai_island_sku']:'${p.sku}'`,
    limit: 5,
  });
  let product = existingList.data[0];

  if (!product) {
    product = await stripe.products.create({
      name: p.name,
      description: p.description,
      metadata: { ai_island_sku: p.sku, ...p.metadata },
    });
    process.stdout.write(` 新建 product ${product.id}`);
  } else {
    process.stdout.write(` 已存在 product ${product.id}`);
  }

  // 找這個 product 已有的 price（同金額、同 currency、同 interval）
  const pricesList = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = pricesList.data.find((pr) => {
    if (pr.unit_amount !== p.amount) return false;
    if (pr.currency !== p.currency) return false;
    if (p.interval) {
      return pr.recurring?.interval === p.interval;
    }
    return !pr.recurring;
  });

  if (!price) {
    const args = {
      product: product.id,
      unit_amount: p.amount,
      currency: p.currency,
      metadata: p.metadata,
    };
    if (p.interval) args.recurring = { interval: p.interval };
    price = await stripe.prices.create(args);
    console.log(` → 新建 price ${price.id} ✅`);
  } else {
    console.log(` → 已有 price ${price.id} ✅`);
  }

  results[p.metadata.env_var] = price.id;
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✨ 完成！把這 3 行貼到 .env.local + Zeabur env：\n");
for (const [k, v] of Object.entries(results)) {
  console.log(`${k}=${v}`);
}
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("接下來：");
console.log("1. .env.local + Zeabur env 都貼上面 3 條");
console.log("2. Stripe Dashboard → Developers → Webhooks → Add endpoint：");
console.log("   https://ai-island-web.snowrealm.pet/api/stripe/webhook");
console.log("   勾這 6 個事件：");
console.log("     · checkout.session.completed");
console.log("     · customer.subscription.created");
console.log("     · customer.subscription.updated");
console.log("     · customer.subscription.deleted");
console.log("     · invoice.paid");
console.log("     · invoice.payment_failed");
console.log("   建好點進去看 Signing secret → 設成 STRIPE_WEBHOOK_SECRET");
console.log("3. Zeabur redeploy");
console.log("4. /pricing 點「立即訂閱」測試一輪（test mode 用卡號 4242 4242 4242 4242）");
