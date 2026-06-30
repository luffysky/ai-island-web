import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { invalidateAppSettings } from "@/lib/app-settings";
import { AGENT_MODEL_SETTING_KEY } from "@/lib/creator-engine/ai/router";
import { AGENTS } from "@/lib/creator-engine/ai/agent-list";

export const dynamic = "force-dynamic";

/** GET → { models, current } 給後台選單。 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const admin = createSupabaseAdmin();
  const [{ data: models }, { data: setting }] = await Promise.all([
    admin.from("ai_models").select("provider, model_name, is_active").eq("is_active", true).order("provider"),
    admin.from("app_settings").select("value").eq("key", AGENT_MODEL_SETTING_KEY).maybeSingle(),
  ]);
  return NextResponse.json({ agents: AGENTS, models: models ?? [], current: (setting as any)?.value ?? {} });
}

/** PUT { map: {agentKey: model_name} } → 儲存。空字串/缺 = 自動。 */
export async function PUT(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const body = await req.json().catch(() => ({} as any));
  const incoming = body.map ?? {};
  const clean: Record<string, string> = {};
  for (const a of AGENTS) {
    const v = incoming[a.key];
    if (typeof v === "string" && v.trim()) clean[a.key] = v.trim();
  }
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("app_settings")
    .upsert({ key: AGENT_MODEL_SETTING_KEY, value: clean, category: "ai", value_type: "json", updated_by: gate.userId }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateAppSettings();
  await admin.from("audit_logs").insert({ actor_id: gate.userId, actor_username: gate.username, action: "admin.creator_island_agent_models", target_type: "app_setting", target_id: AGENT_MODEL_SETTING_KEY, changes: clean }).then(() => {}, () => {});
  return NextResponse.json({ ok: true, current: clean });
}
