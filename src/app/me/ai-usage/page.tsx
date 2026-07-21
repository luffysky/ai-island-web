import type { Metadata } from "next";
import AiUsageClient from "./AiUsageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 使用量 / 成本",
  description: "看你自己近 30 天的 AI 用量與本月額度。",
};

export default function AiUsagePage() {
  // auth guard + sidebar 由 src/app/me/layout.tsx 處理
  return <AiUsageClient />;
}
