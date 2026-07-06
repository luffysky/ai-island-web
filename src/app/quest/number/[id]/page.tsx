import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getNumberLevel } from "@/lib/quest/number-levels";
import { NumberPlay } from "./NumberPlay";

export const dynamic = "force-dynamic";

export default async function NumberLevelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const level = getNumberLevel(id);
  if (!level) return notFound();
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let done: { stars: number } | null = null;
  if (user) {
    const { data } = await supabase.from("quest_completions").select("stars").eq("user_id", user.id).eq("level_id", id).maybeSingle();
    if (data) done = { stars: (data as any).stars };
  }
  return <NumberPlay level={level} done={done} />;
}
