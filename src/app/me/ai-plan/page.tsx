import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AiPlanClient } from "./AiPlanClient";

export const dynamic = "force-dynamic";

export default async function MyAiPlanPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("career_path").eq("id", user.id).maybeSingle();
  const { data: plan } = await supabase
    .from("learning_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🧭 AI 導師客製化規劃</h1>
        <p className="text-sm text-fg-muted mt-1">
          AI 看你的學習歷史、產出個人化的學習計畫。3 種深度模式自己選。
        </p>
      </header>
      <AiPlanClient initialPlan={plan as any} defaultCareer={profile?.career_path ?? "fullstack"} />
    </div>
  );
}
