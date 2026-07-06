import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getDebugLevel } from "@/lib/quest/debug-levels";
import { DebugPlay } from "./DebugPlay";

export const dynamic = "force-dynamic";

export default async function DebugLevelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const level = getDebugLevel(id);
  if (!level) return notFound();
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let done: { stars: number } | null = null;
  if (user) {
    const { data } = await supabase.from("quest_completions").select("stars").eq("user_id", user.id).eq("level_id", id).maybeSingle();
    if (data) done = { stars: (data as any).stars };
  }
  return <DebugPlay level={level} done={done} />;
}
