import type { Metadata } from "next";
import { TemplatesClient } from "./TemplatesClient";

export const metadata: Metadata = {
  title: "生活助理範本 · 分身島 · AI 島",
  description: "一鍵生活助理範本：查政府補助、比價、旅遊規劃、育兒問答、翻譯潤稿、每日新聞摘要…點一下預填指令，分身島幫你查、幫你寫、幫你規劃。",
  alternates: { canonical: "/agent/templates" },
};

export const dynamic = "force-dynamic";

export default function AgentTemplatesPage() {
  return <TemplatesClient />;
}
