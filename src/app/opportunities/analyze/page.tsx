import type { Metadata } from "next";
import { AnalyzeWorkClient } from "./AnalyzeWorkClient";

export const metadata: Metadata = {
  title: "AI 作品分析 — 機會島 | AI 島",
  description: "貼上你的作品集/GitHub/個人網站或履歷，AI 幫你萃取能力圖譜、找到適合的競賽補助與機會方向。",
  alternates: { canonical: "/opportunities/analyze" },
};

export const dynamic = "force-dynamic";

export default function AnalyzeWorkPage() {
  return <AnalyzeWorkClient />;
}
