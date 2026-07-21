import type { Metadata } from "next";
import { Fortune } from "./Fortune";

export const metadata: Metadata = {
  title: "每日運勢 · AI 島",
  description: "填一次生日，每天為你占卜今日運勢——整體、愛情、事業、財運，加上幸運色與幸運數字，正向陪你過每一天。",
  alternates: { canonical: "/fortune" },
};

export const dynamic = "force-dynamic";

export default function FortunePage() {
  return <Fortune />;
}
