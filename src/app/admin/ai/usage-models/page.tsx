import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { USAGE_LABELS } from "@/lib/ai-usage-models";
import { UsageModelsClient } from "./UsageModelsClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function UsageModelsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["admin", "owner"].includes((profile as any).role)) {
    redirect("/");
  }

  const admin = createSupabaseAdmin();
  const [{ data: usageRows }, { data: models }] = await Promise.all([
    admin.from("ai_usage_models").select("*").order("usage_key"),
    admin.from("ai_models").select("model_name, display_name, provider, is_active").order("provider").order("model_name"),
  ]);

  // 確保 USAGE_LABELS 內每個 key 都有 row (DB seed 已塞、但補保險)
  const usageMap = new Map<string, any>();
  for (const r of (usageRows as any[]) ?? []) usageMap.set(r.usage_key, r);

  const rows = (Object.keys(USAGE_LABELS) as Array<keyof typeof USAGE_LABELS>).map((key) => {
    const existing = usageMap.get(key);
    return {
      usage_key: key,
      description: USAGE_LABELS[key],
      model_name: existing?.model_name ?? "",
      enabled: existing?.enabled ?? true,
    };
  });

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🎛️"
        title="AI 用途 ↔ 模型對應"
        desc="每個 AI 場景可獨立指定 model：LINE bot 用 Sonnet、Nami 出題用 Opus、留言審核用 Haiku 省錢。改完 1 分鐘內生效（in-memory cache）。"
        gradient="from-indigo-500/10 via-violet-500/10 to-purple-500/10"
        borderColor="border-indigo-500/30"
      />

      <UsageModelsClient initialRows={rows} models={(models as any[]) ?? []} />
    </div>
  );
}
