import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ConnectionsClient } from "./ConnectionsClient";

export const metadata: Metadata = { title: "連結帳號 — AI 島", description: "把你的社群/工具帳號連結到 AI 島，一個平台可綁多個帳號。" };
export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/settings/connections");
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent mb-3"><ArrowLeft className="w-4 h-4" /> 設定</Link>
      <h1 className="text-2xl font-bold mb-1">🔗 連結帳號</h1>
      <p className="text-sm text-fg-muted mb-5">把你的社群/工具帳號連到 AI 島，之後分身島才能幫你在這些平台做事（發草稿、讀通知）。<b>同一個平台可以綁多個帳號</b>（例如多個 IG）。對外動作一律「AI 起草 → 你一鍵批准」。</p>
      <ConnectionsClient />
    </div>
  );
}
