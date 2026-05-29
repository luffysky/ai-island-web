import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ResumeClient } from "./ResumeClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🪪 AI 履歷 · AI 島",
  description: "雪鑰看你的學習資料、自動生成適合 indie / Junior / Senior / 接案的履歷",
};

export default async function ResumePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/resume");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          🪪 AI 履歷生成
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          雪鑰看你 lesson 進度 / LeetCode / 作品集 / 連勝、生成一份 markdown 履歷、可貼 LinkedIn / GitHub / 印 PDF
        </p>
      </header>
      <ResumeClient />
    </div>
  );
}
