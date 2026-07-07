import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AiHistoryClient } from "./AiHistoryClient";

export const dynamic = "force-dynamic";

export default async function MyAiHistoryPage() {
  const t = await getTranslations("mentor");
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
        <h1 className="text-2xl font-bold">🤖 {t("aiHistoryPageTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("aiHistoryPageSubtitle")}
        </p>
      </header>
      <AiHistoryClient initial={(conversations ?? []) as any} />
    </div>
  );
}
