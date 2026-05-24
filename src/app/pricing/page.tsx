import Link from "next/link";
import { Check, Crown } from "lucide-react";

export const metadata = {
  title: "💎 訂閱方案 · AI 島",
  description: "解鎖全部 71 章、無限 AI 對話、教材常更新",
};

const PLANS = [
  {
    id: "single",
    name: "單章購買",
    price: 99,
    period: "次性",
    desc: "只買你需要的那一章",
    features: ["指定章節終身學", "AI 對話免費額度（10/天）", "可隨時升級訂閱抵金"],
    cta: "選章節購買",
    highlight: false,
  },
  {
    id: "monthly",
    name: "月訂閱",
    price: 299,
    period: "/ 月",
    desc: "新手與想快速試試的人",
    features: ["全部 71 章內容", "AI 對話無限制", "綠寶 / 肥仔 / 菇寶導師", "每月新章節更新", "教師批改作業", "可隨時取消"],
    cta: "立即訂閱",
    highlight: true,
    badge: "🔥 最熱門",
  },
  {
    id: "yearly",
    name: "年訂閱",
    price: 2999,
    period: "/ 年",
    desc: "全力學習、省 NT$ 589",
    features: ["月訂全部特權", "再省 16%", "送 z 幣 1000", "VIP 寵物造型", "優先客服回應"],
    cta: "省更多",
    highlight: false,
    badge: "💰 省最多",
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3">
          <Crown size={42} className="inline text-yellow-400 mr-2" />
          升級解鎖完整 AI 島
        </h1>
        <p className="text-lg text-fg-muted">
          前 5 章永遠免費。要學完整全端 + AI 課程？選一個你想要的方式。
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((p) => (
          <div
            id={p.id}
            key={p.id}
            className={`relative rounded-2xl p-6 border-2 ${
              p.highlight
                ? "border-accent bg-gradient-to-br from-accent/15 to-accent-2/5 scale-[1.02]"
                : "border-border bg-bg-card"
            }`}
          >
            {p.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent text-black text-[10px] font-bold">
                {p.badge}
              </div>
            )}
            <h2 className="text-xl font-bold">{p.name}</h2>
            <p className="text-xs text-fg-muted mb-4">{p.desc}</p>
            <div className="mb-4">
              <span className="text-4xl font-extrabold text-accent">NT$ {p.price.toLocaleString()}</span>
              <span className="text-sm text-fg-muted ml-1">{p.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              disabled
              className={`w-full px-4 py-3 rounded-lg font-bold ${
                p.highlight ? "bg-accent text-black" : "border border-border"
              } opacity-60 cursor-not-allowed`}
              title="金流整合中、敬請期待"
            >
              {p.cta}（即將開放）
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-bg-card border border-border p-6">
        <h3 className="font-bold mb-3 flex items-center gap-2">❓ 常見問題</h3>
        <div className="space-y-3 text-sm">
          <details className="border-b border-border pb-2">
            <summary className="font-semibold cursor-pointer">可以先試試嗎？</summary>
            <p className="mt-2 text-fg-muted">前 5 章永久免費、足以體驗整套架構。覺得喜歡再升級。</p>
          </details>
          <details className="border-b border-border pb-2">
            <summary className="font-semibold cursor-pointer">月訂閱可以隨時取消嗎？</summary>
            <p className="mt-2 text-fg-muted">可以、取消後當期到期才停。已付的不退款（但會看完整月）。</p>
          </details>
          <details className="border-b border-border pb-2">
            <summary className="font-semibold cursor-pointer">AI 對話無限制是真的無限嗎？</summary>
            <p className="mt-2 text-fg-muted">是、不扣每日 10 次的免費額度。但仍受系統月預算保護（避免 abuse）。</p>
          </details>
          <details>
            <summary className="font-semibold cursor-pointer">學員 / 企業優惠？</summary>
            <p className="mt-2 text-fg-muted">企業方案請來信、學生憑學生證可享 8 折。</p>
          </details>
        </div>
      </div>

      <p className="text-[10px] text-fg-muted text-center mt-8">
        💳 金流整合中（Stripe / TapPay）、即將開放購買。目前可在 /me/support 提工單表達興趣、會優先通知開放。
      </p>
    </div>
  );
}
