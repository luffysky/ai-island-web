import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { RateLimitRulesClient } from "./RateLimitRulesClient";

export const dynamic = "force-dynamic";

type Rule = {
  scope: string;
  limit_count: number;
  window_seconds: number;
  enabled: boolean;
  note: string | null;
  updated_at: string;
};

export default async function RateLimitsAdminPage() {
  const admin = createSupabaseAdmin();
  const { data: rules } = await admin
    .from("rate_limit_rules")
    .select("*")
    .order("scope");

  // 最近 24h 限流命中數
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const { data: hitsByScope } = await admin
    .from("rate_limit_hits")
    .select("scope")
    .gte("hit_at", dayAgo);

  const hitCount: Record<string, number> = {};
  for (const h of hitsByScope ?? []) {
    const s = (h as any).scope as string;
    hitCount[s] = (hitCount[s] ?? 0) + 1;
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🚦 API Rate Limit</h1>
        <p className="text-sm text-fg-muted mt-1">
          每 user + scope 滑動視窗限流。沒對應規則 = 不限。anon 請求 = 不限。
        </p>
      </header>

      <RateLimitRulesClient rules={(rules ?? []) as Rule[]} hitCount={hitCount} />
    </div>
  );
}
