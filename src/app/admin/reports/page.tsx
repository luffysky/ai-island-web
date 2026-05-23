import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string; target_type?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "pending";
  const reason = sp.reason ?? "";
  const target_type = sp.target_type ?? "";

  const admin = createSupabaseAdmin();
  let q = admin
    .from("user_reports")
    .select(`
      id, target_type, target_id, target_owner_id, reason, note, status, created_at, resolution_note,
      reporter:profiles!user_reports_reporter_id_fkey(username, display_name),
      owner:profiles!user_reports_target_owner_id_fkey(username, display_name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") q = q.eq("status", status);
  if (reason) q = q.eq("reason", reason);
  if (target_type) q = q.eq("target_type", target_type);

  const { data, count } = await q;

  const [{ count: pendingCount }, { count: todayCount }] = await Promise.all([
    admin.from("user_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("user_reports").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🚨 檢舉收件箱</h1>
        <p className="text-sm text-fg-muted mt-1">使用者送出的檢舉、按時序處理。</p>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="待處理" value={pendingCount ?? 0} tone="warning" />
        <Stat label="今日新增" value={todayCount ?? 0} />
        <Stat label="目前篩選" value={count ?? 0} tone="muted" />
      </div>

      <ReportsClient
        initial={(data ?? []) as any}
        filters={{ status, reason, target_type }}
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
