import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { GamificationRulesClient } from "./GamificationRulesClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminGamificationPage() {
  const admin = createSupabaseAdmin();
  const { data: rules } = await admin
    .from("gamification_rules")
    .select("*")
    .order("kind")
    .order("key");

  return (
    <div>
      <PageHero
        emoji="🎮"
        title="遊戲化規則編輯器"
        desc="XP / Z-coin / 成就條件 / 連勝加成 / 升級獎勵的參數。改完即時生效 (code 有讀此表)。"
        gradient="from-purple-500/10 via-fuchsia-500/10 to-pink-500/10"
        borderColor="border-purple-500/30"
      />
      <GamificationRulesClient initial={(rules ?? []) as any} />
    </div>
  );
}
