import type { Metadata } from "next";
import { EnergyCenter } from "@/components/me/EnergyCenter";

export const metadata: Metadata = {
  title: "AI 能源中心 | AI 島",
  description: "你的每日免費 AI 額度、Z 幣餘額、分身島活動一覽。",
};

export default function EnergyPage() {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <EnergyCenter />
    </div>
  );
}
