import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { Sprout } from "lucide-react";
import { SeedStudioClient } from "./SeedStudioClient";

export const dynamic = "force-dynamic";

const PERSONA_USERNAMES = ["ai_island", "greenbot", "pygoblin", "frontelf", "debugpapa", "duowen"];

export default async function SeedStudioPage() {
  const admin = createSupabaseAdmin();
  const [{ data: boards }, { data: personas }] = await Promise.all([
    admin.from("forum_boards").select("id, name, slug, description, category, emoji").eq("is_active", true).order("sort_order"),
    admin.from("profiles").select("id, username, display_name, bio").in("username", PERSONA_USERNAMES),
  ]);
  const ordered = PERSONA_USERNAMES.map((u) => (personas ?? []).find((p: any) => p.username === u)).filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHero
        icon={Sprout}
        title="種子工作室"
        desc="一頁搞定：討論區 / 部落格 / 筆記三種種子。AI 生成或手動填 → 審核/編輯 → 以虛擬 AI 住民或官方身分發佈。"
        gradient="from-emerald-500/10 via-teal-500/10 to-sky-500/10"
        borderColor="border-emerald-500/30"
      />
      <SeedStudioClient boards={(boards ?? []) as any} personas={ordered as any} />
    </div>
  );
}
