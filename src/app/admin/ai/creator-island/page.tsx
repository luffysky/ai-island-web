import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { AgentModelsClient } from "./AgentModelsClient";
import { AGENTS } from "@/app/api/admin/creator-island/agent-models/route";
import { AGENT_MODEL_SETTING_KEY } from "@/lib/creator-engine/ai/router";

export const dynamic = "force-dynamic";

export default async function CreatorIslandAIPage() {
  const admin = createSupabaseAdmin();
  const [{ data: models }, { data: setting }] = await Promise.all([
    admin.from("ai_models").select("provider, model_name, is_active").eq("is_active", true).order("provider"),
    admin.from("app_settings").select("value").eq("key", AGENT_MODEL_SETTING_KEY).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <PageHero
        emoji="🏝️"
        title="創作者島嶼 — AI 模型"
        desc="指定每個創作 agent 用哪個模型。留空＝自動挑最佳可用。這些任務不需高階模型，可選便宜的（含 OpenRouter）。在 /admin/ai/models 新增/啟用模型與 key。"
        gradient="from-cyan-500/10 via-teal-500/10 to-emerald-500/10"
        borderColor="border-teal-500/30"
      />
      <AgentModelsClient agents={AGENTS} models={(models ?? []) as any} current={((setting as any)?.value ?? {}) as any} />
    </div>
  );
}
