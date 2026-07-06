import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getLevel } from "@/lib/quest/levels";
import { QuestPlay } from "./QuestPlay";

export const dynamic = "force-dynamic";

export default async function QuestLevelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const level = getLevel(id);
  if (!level) return notFound();

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let done: { stars: number } | null = null;
  if (user) {
    const { data } = await supabase.from("quest_completions").select("stars").eq("user_id", user.id).eq("level_id", id).maybeSingle();
    if (data) done = { stars: (data as any).stars };
  }

  return <QuestPlay level={level} done={done} />;
}
