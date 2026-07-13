import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { OfficeClient } from "./OfficeClient";

export const metadata: Metadata = {
  title: "AI 員工辦公室 — 分身島 · AI 島",
  description: "你的 AI 員工辦公室：看每位員工的狀態、一鍵派熱門任務、看今日產出。對外動作一律先問過你才做。",
  alternates: { canonical: "/agent/office" },
};

export const dynamic = "force-dynamic";

export default async function OfficePage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/agent/office");
  return <OfficeClient />;
}
