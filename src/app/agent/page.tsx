import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { AgentClient } from "./AgentClient";

export const metadata: Metadata = {
  title: "分身島 · Agent — AI 島",
  description: "把目標交給你的數位分身：它會一步步規劃、用工具查資料/操作、記得你、跨裝置延續，關鍵動作先問過你才做。",
  alternates: { canonical: "/agent" },
};

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/agent");
  return <AgentClient />;
}
