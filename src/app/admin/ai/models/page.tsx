import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ModelsManagerClient } from "./ModelsManagerClient";
import { PageHero } from "@/components/admin/PageHero";
import { AlertTriangle } from "lucide-react";

export default async function ModelsAdminPage() {
  const supabase = createSupabaseAdmin();

  const { data: models, error } = await supabase
    .from("ai_models")
    .select("*")
    .order("sort_order");

  const { data: keys } = await supabase
    .from("ai_api_keys")
    .select("id, provider, enabled, monthly_budget_usd, used_this_month_usd, metadata, updated_at");

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 需要先跑 ai_migration.sql</div>
        <code className="block bg-bg p-3 rounded text-xs">supabase/ai_migration.sql</code>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        emoji="🤖"
        title="AI 模型管理"
        desc="設定每個 provider 的 API key、月預算、模型可用性、免費 quota。配合 /admin/ai/usage-models 細分用途。"
        gradient="from-purple-500/10 via-fuchsia-500/10 to-pink-500/10"
        borderColor="border-purple-500/30"
      />

      <ModelsManagerClient
        initialModels={models ?? []}
        initialKeys={keys ?? []}
      />
    </div>
  );
}
