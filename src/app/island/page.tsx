import { createSupabaseServer } from "@/lib/supabase-server";
import IslandClient from "./IslandClient";

export const dynamic = "force-dynamic";

export default async function IslandPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let completedChapterIds: number[] = [];
  let level = 1;
  let petName: string | null = null;
  if (user) {
    const [{ data: progress }, { data: profile }, { data: pet }] = await Promise.all([
      supabase.from("lesson_progress").select("chapter_id").eq("user_id", user.id),
      supabase.from("profiles").select("level").eq("id", user.id).single(),
      supabase.from("pets").select("name").eq("user_id", user.id).maybeSingle(),
    ] as any);
    // 章節完成定義：該 chapter 至少完成一個 lesson（簡單版）
    const set = new Set<number>();
    for (const p of (progress as any[]) ?? []) if (p.chapter_id) set.add(Number(p.chapter_id));
    completedChapterIds = Array.from(set).sort((a, b) => a - b);
    level = (profile as any)?.level ?? 1;
    petName = (pet as any)?.name ?? null;
  }

  return <IslandClient completedChapterIds={completedChapterIds} level={level} petName={petName} />;
}
