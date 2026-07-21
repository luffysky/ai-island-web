import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { JobKitClient } from "./JobKitClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🎒 AI 求職包 · AI 島",
  description: "履歷、自傳、求職信、模擬面試一站搞定——AI 依你的學習資料幫你準備求職文件。",
};

export default async function JobKitPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/job-kit");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🎒 AI 求職包</h1>
        <p className="text-sm text-fg-muted mt-1">履歷、自傳、求職信、模擬面試一站搞定，AI 依你的學習資料幫你準備。</p>
      </header>
      <JobKitClient />
    </div>
  );
}
