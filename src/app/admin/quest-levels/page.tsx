import { PageHero } from "@/components/admin/PageHero";
import { Gamepad2 } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { QuestLevelGenClient } from "./QuestLevelGenClient";

export const dynamic = "force-dynamic";

export default async function QuestLevelsAdminPage() {
  const admin = createSupabaseAdmin();
  const { data: existing } = await admin
    .from("quest_ai_levels")
    .select("level_id, title, concept, xp, z, created_at")
    .eq("game_type", "number")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <PageHero
        icon={Gamepad2}
        title="AI 關卡生成器（數字關）"
        desc="出主題 → AI 生 Python 數字關卡草稿 → 你審核/試跑 → 存進遊戲。存好的關卡會自動出現在「程式副本島 → 數字關卡」後面，衝關卡數用。"
        gradient="from-sky-500/10 via-blue-500/10 to-cyan-500/10"
        borderColor="border-sky-500/30"
      />
      <QuestLevelGenClient existing={(existing ?? []) as any} />
    </div>
  );
}
