import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { GamificationRulesClient } from "./GamificationRulesClient";

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
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🎮 遊戲化規則編輯器</h1>
        <p className="text-sm text-fg-muted mt-1">
          XP / Z-coin / 成就條件 / 連勝加成 / 升級獎勵的參數。改完即時生效（程式碼若有讀此表）。
        </p>
      </header>
      <GamificationRulesClient initial={(rules ?? []) as any} />
    </div>
  );
}
