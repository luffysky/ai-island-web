import { Crown } from "lucide-react";
import { PricingClient } from "./PricingClient";

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
    icon: "📘",
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
    icon: "🚀",
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
    icon: "👑",
  },
];

export default function PricingPage() {
  return <PricingClient plans={PLANS} />;
}
