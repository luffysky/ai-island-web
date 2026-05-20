import { createSupabaseServer } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: progress }, { data: achievements }, { data: quests }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("lesson_progress").select("chapter_id, lesson_id, completed_at").eq("user_id", user.id),
    supabase.from("user_achievements").select("achievement_id, unlocked_at, achievements(*)").eq("user_id", user.id),
    supabase.from("daily_quests").select("*").eq("user_id", user.id).eq("quest_date", new Date().toISOString().split("T")[0]),
  ]);

  return <DashboardView
    profile={profile}
    progress={progress ?? []}
    achievements={achievements ?? []}
    quests={quests ?? []}
  />;
}
