import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { MessagesSquare } from "lucide-react";
import { ForumSeedClient } from "./ForumSeedClient";

export const dynamic = "force-dynamic";

const PERSONA_USERNAMES = ["ai_island", "greenbot", "debugpapa", "frontelf", "pygoblin", "duowen"];

export default async function ForumSeedPage() {
  const admin = createSupabaseAdmin();
  const [{ data: boards }, { data: personas }] = await Promise.all([
    admin.from("forum_boards").select("id, name, slug, description, category, emoji").eq("is_active", true).order("sort_order"),
    admin.from("profiles").select("id, username, display_name, bio").in("username", PERSONA_USERNAMES),
  ]);
  // 依既定順序排 persona
  const orderedPersonas = PERSONA_USERNAMES
    .map((u) => (personas ?? []).find((p: any) => p.username === u))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHero
        icon={MessagesSquare}
        title="討論區種子生成器"
        desc="選版塊 + 語氣 → AI 生幾篇草稿 → 你審核/編輯 → 以虛擬 AI 住民身分發文。draft → 審核 → 發，不自動亂灑。"
        gradient="from-emerald-500/10 via-teal-500/10 to-cyan-500/10"
        borderColor="border-emerald-500/30"
      />
      <ForumSeedClient boards={(boards ?? []) as any} personas={orderedPersonas as any} />
    </div>
  );
}
