import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { USAGE_LABELS } from "@/lib/ai-usage-models";
import { UsageModelsClient } from "./UsageModelsClient";

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
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          🎛️ AI 用途 ↔ 模型對應
        </h2>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          每個 AI 場景可獨立指定 model。例：LINE bot 用 Sonnet、Nami 出題用 Opus、留言審核用 Haiku 省錢。<br />
          沒勾「啟用」→ caller 走 fallback (預設 model)。改完按「儲存全部」、各 webhook / endpoint 1 分鐘內生效 (in-memory cache)。
        </p>
      </div>

      <UsageModelsClient initialRows={rows} models={(models as any[]) ?? []} />
    </div>
  );
}
