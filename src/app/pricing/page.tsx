import { PricingClient } from "./PricingClient";
import { SITE_STATS } from "@/lib/site-stats";

const CH = SITE_STATS.chapterCount;

export const metadata = {
  title: "全部免費 · AI 島",
  description: `全 ${CH} 章、${SITE_STATS.lessonCount}+ lesson、AI 導師、Playground——所有內容 100% 免費，不販售、不訂閱。`,
};

export default function PricingPage() {
  return <PricingClient />;
}
