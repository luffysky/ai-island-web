import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AiPlanClient } from "./AiPlanClient";

export const dynamic = "force-dynamic";

export default async function MyAiPlanPage() {
  const t = await getTranslations("mentor");
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
        <h1 className="text-2xl font-bold flex items-center gap-2">🧭 {t("aiPlanPageTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("aiPlanPageSubtitle")}
        </p>
      </header>
      <AiPlanClient initialPlan={plan as any} defaultCareer={profile?.career_path ?? "fullstack"} />
    </div>
  );
}
