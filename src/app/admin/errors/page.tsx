import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ErrorLogsClient } from "./ErrorLogsClient";
import { PageHero, AdminStatCard } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminErrorLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; source?: string; resolved?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const level = sp.level ?? "";
  const source = sp.source ?? "";
  const resolvedFilter = sp.resolved ?? "open"; // open | resolved | all
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 50;

  const admin = createSupabaseAdmin();
  let query = admin
    .from("error_logs")
    .select(
      "id, occurred_at, level, source, message, status_code, request_path, user_id, resolved, resolved_at",
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (level) query = query.eq("level", level);
  if (source) query = query.ilike("source", `%${source}%`);
  if (resolvedFilter === "open") query = query.eq("resolved", false);
  else if (resolvedFilter === "resolved") query = query.eq("resolved", true);

  const { data: logs, count } = await query;

  // 統計：未解決 / 今日 / 本週
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [{ count: openCount }, { count: todayCount }, { count: weekCount }] = await Promise.all([
    admin.from("error_logs").select("*", { count: "exact", head: true }).eq("resolved", false),
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("occurred_at", startOfToday),
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("occurred_at", sevenAgo),
  ]);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🛡️"
        title="錯誤日誌"
        desc="server-side / API 失敗的紀錄。任何 fail-soft 都會落到這、可逐筆解決、看 stack / context。"
        gradient="from-red-500/10 via-orange-500/10 to-yellow-500/10"
        borderColor="border-red-500/30"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminStatCard label="待解決" value={openCount ?? 0} color="text-orange-400" hint={openCount && openCount > 20 ? "⚠️ 偏多" : undefined} />
        <AdminStatCard label="今日新增" value={todayCount ?? 0} color="text-blue-400" />
        <AdminStatCard label="本週累計" value={weekCount ?? 0} color="text-purple-400" />
        <AdminStatCard label="目前篩選" value={count ?? 0} color="text-fg-muted" />
      </div>

      <ErrorLogsClient
        initial={(logs ?? []) as any}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        filters={{ level, source, resolved: resolvedFilter }}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" | "muted" }) {
  const color = tone === "warning" ? "text-warning" : tone === "muted" ? "text-fg-muted" : "text-accent";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}
