import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AiHistoryClient } from "./AiHistoryClient";

export const dynamic = "force-dynamic";

export default async function MyAiHistoryPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversations } = await supabase
    .from("ai_conversations")
    .select("id, title, tone, model_id, created_at, updated_at, context_chapter_id, context_lesson_id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">🤖 AI 學伴對話紀錄</h1>
        <p className="text-sm text-fg-muted mt-1">
          你跟 AI 導師（綠寶 / 肥仔 / 菇寶）的所有對話、按時間排序、點開看完整內容。
        </p>
      </header>
      <AiHistoryClient initial={(conversations ?? []) as any} />
    </div>
  );
}
