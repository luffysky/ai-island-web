import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ModelsManagerClient } from "./ModelsManagerClient";

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
        <div className="font-bold mb-2">⚠️ 需要先跑 ai_migration.sql</div>
        <code className="block bg-bg p-3 rounded text-xs">supabase/ai_migration.sql</code>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">🤖 AI 模型管理</h2>
        <p className="text-sm text-fg-muted mt-1">
          設定每個 provider 的 API key、月預算、模型可用性、免費 quota。
        </p>
      </div>

      <ModelsManagerClient
        initialModels={models ?? []}
        initialKeys={keys ?? []}
      />
    </div>
  );
}
