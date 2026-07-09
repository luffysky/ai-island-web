// 補助計畫書「待補」事實查核：唯讀查 DB 數字 + 檢查 env 是否設定（只印布林、不印任何金鑰值）。
// 用法：node scripts/grant-facts.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("❌ 缺 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

// 只取 count、不拉資料
async function count(table, build) {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (build) q = build(q);
  const { count, error } = await q;
  if (error) return `⚠️ ${error.message}`;
  return count ?? 0;
}

const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();
const D = 86400000;

console.log("\n════════ 內容規模（DB 實際） ════════");
console.log("chapters            :", await count("chapters"));
console.log("lessons             :", await count("lessons"));
console.log("leetcode_questions  :", await count("leetcode_questions"), "（每日測驗用、有選項答案）");
console.log("leetcode_problems   :", await count("leetcode_problems"), "（題目目錄、無答案）");
console.log("chapter_quizzes     :", await count("chapter_quizzes"));

console.log("\n════════ Traction（真實使用者數據） ════════");
console.log("profiles 總用戶      :", await count("profiles"));
console.log("  近 1 日活躍(DAU)   :", await count("profiles", (q) => q.gte("last_active_at", iso(1 * D))));
console.log("  近 7 日活躍(WAU)   :", await count("profiles", (q) => q.gte("last_active_at", iso(7 * D))));
console.log("  近 30 日活躍(MAU)  :", await count("profiles", (q) => q.gte("last_active_at", iso(30 * D))));
console.log("analytics_sessions  :", await count("analytics_sessions"));
console.log("  近 7 日 session    :", await count("analytics_sessions", (q) => q.gte("created_at", iso(7 * D))));
console.log("analytics_events    :", await count("analytics_events"));

console.log("\n════════ 學習/互動產出 ════════");
console.log("lesson_progress     :", await count("lesson_progress"));
console.log("notes 筆記           :", await count("notes"));
console.log("  公開筆記           :", await count("notes", (q) => q.eq("is_public", true)));
console.log("certificates 證書    :", await count("certificates"));
console.log("forum_threads        :", await count("forum_threads"));
console.log("blog_articles        :", await count("blog_articles"));
console.log("daily_quiz_attempts  :", await count("daily_quiz_attempts"));

console.log("\n════════ 金流 / 訂閱（真實成交？） ════════");
console.log("orders 總單          :", await count("orders"));
console.log("  已付款 paid        :", await count("orders", (q) => q.eq("status", "paid")));
console.log("  已完成 fulfilled   :", await count("orders", (q) => q.eq("status", "fulfilled")));
console.log("subscriptions        :", await count("subscriptions"));
console.log("  active 訂閱        :", await count("subscriptions", (q) => q.eq("status", "active")));
console.log("coin_transactions    :", await count("coin_transactions"));
console.log("referrals 推薦成功    :", await count("referrals"));

console.log("\n════════ AI 使用量 ════════");
console.log("ai_messages          :", await count("ai_messages"));
console.log("ai_model_usage 列     :", await count("ai_model_usage"));

// ── env 檢查：只印「有沒有設」，絕不印值 ──
const has = (n) => (process.env[n] && String(process.env[n]).trim() ? "✅ 已設" : "— 未設");
console.log("\n════════ 金流 env（只印是否設定、不印值） ════════");
console.log("PAYMENTS_LIVE=1 正式收款:", process.env.PAYMENTS_LIVE === "1" ? "✅ 正式" : "— 測試/未開");
console.log("綠界 ECPay     :", has("ECPAY_MERCHANT_ID"), has("ECPAY_HASH_KEY"), has("ECPAY_HASH_IV"));
console.log("藍新 NewebPay  :", has("NEWEBPAY_MERCHANT_ID"), has("NEWEBPAY_HASH_KEY"), has("NEWEBPAY_HASH_IV"));
console.log("Stripe         :", has("STRIPE_SECRET_KEY"), has("STRIPE_WEBHOOK_SECRET"));
console.log("LemonSqueezy   :", has("LEMONSQUEEZY_API_KEY"), has("LEMONSQUEEZY_STORE_ID"));
console.log("Paddle         :", has("PADDLE_API_KEY"));

console.log("\n════════ 其他 env ════════");
console.log("Web Push VAPID :", has("VAPID_PRIVATE_KEY"), has("VAPID_PUBLIC_KEY") === "— 未設" ? has("NEXT_PUBLIC_VAPID_PUBLIC_KEY") : has("VAPID_PUBLIC_KEY"));
console.log("Resend email   :", has("RESEND_API_KEY"));
console.log("GA4 追蹤 ID    :", has("NEXT_PUBLIC_GA4_ID") === "— 未設" ? has("NEXT_PUBLIC_GA_ID") : has("NEXT_PUBLIC_GA4_ID"));
console.log("GA4 Data API   :", has("GA4_PROPERTY_ID"));
console.log("AI 金鑰加密 secret:", has("AI_KEY_SECRET"));
console.log("");
