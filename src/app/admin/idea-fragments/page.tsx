import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/admin/PageHero";
import { IdeaFragmentsClient } from "./IdeaFragmentsClient";

export const dynamic = "force-dynamic";

export default async function IdeaFragmentsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(profile?.role === "admin" || (profile as any)?.is_owner === true)) redirect("/");

  const admin = createSupabaseAdmin();
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10); // 台北時區
  const [{ data: fragments }, { data: ideas }, { data: daily }, { data: folders }] = await Promise.all([
    admin.from("idea_fragments").select("*").order("created_at", { ascending: false }).limit(500),
    admin.from("generated_ideas").select("*").order("created_at", { ascending: false }).limit(100),
    admin.from("generated_ideas").select("*").eq("daily_date", today).maybeSingle(),
    admin.from("idea_folders").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
  ]);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="💡"
        title="給我一個點子"
        desc="把散落的人生碎片，變成下一個可能。收集靈感碎片 → AI 分析 → 重組出全新的點子。"
        gradient="from-amber-500/10 via-pink-500/10 to-violet-500/10"
        borderColor="border-amber-500/30"
      />
      <IdeaFragmentsClient
        initialFragments={(fragments as any) ?? []}
        initialIdeas={(ideas as any) ?? []}
        initialDaily={(daily as any) ?? null}
        initialFolders={(folders as any) ?? []}
      />
    </div>
  );
}
