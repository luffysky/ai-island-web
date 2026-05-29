import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { MockInterviewClient } from "./MockInterviewClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🎤 AI 模擬面試 · AI 島",
  description: "雪鑰當面試官、技術 / 行為 / 系統設計三模式、結束有完整評分 + 建議",
};

export default async function MockInterviewPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/mock-interview");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🎤 AI 模擬面試</h1>
        <p className="text-sm text-fg-muted mt-1">
          選類型 + 角色、雪鑰當面試官、結束按「結束面試」拿完整評分 + 改進建議
        </p>
      </header>
      <MockInterviewClient />
    </div>
  );
}
