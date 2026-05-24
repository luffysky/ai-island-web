import { CareerPathSection } from "@/components/home/CareerPathSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "6 大職業路線 — 前端 / 全端 / AI / 資料 / 接案 / 創業 | AI 島",
  description: "選一條最短路徑學程式：前端工匠 / 全端戰士 / AI 馴獸師 / 資料煉金 / 接案傭兵 / 島民創業家、客製學習地圖。",
  alternates: { canonical: "/career" },
  openGraph: {
    title: "6 大職業路線 | AI 島",
    description: "選一條最符合你目標的職業路線、客製學習地圖。",
    type: "website",
  },
};

export default function CareerIndexPage() {
  return (
    <div>
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-2">🎯 6 大職業路線</h1>
        <p className="text-fg-muted">選一條最符合你目標的路、最短時間最快上場</p>
      </div>
      <CareerPathSection />
    </div>
  );
}
