import type { Metadata } from "next";
import { History } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ActivityFeed } from "./ActivityFeed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "我的操作記錄 | AI 島" };

export default async function ActivityPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black inline-flex items-center gap-2">
          <History size={26} className="text-accent" /> 我的操作記錄
        </h1>
        <p className="text-sm text-fg-muted mt-1.5">你在 AI 島與創作者島嶼的所有操作，一條時間軸看完、點得進去。</p>
      </header>
      <ActivityFeed />
    </div>
  );
}
