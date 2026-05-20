import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("subscriptions")
    .select("*, profiles(username, display_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.status) query = query.eq("status", params.status);

  const { data: subs, error } = await query;

  // MRR
  const activeSubsAll = (subs ?? []).filter((s: any) => s.status === "active");
  const mrr = activeSubsAll.reduce((sum: number, s: any) => sum + (s.plan_price ?? 0), 0);
  const churned = (subs ?? []).filter((s: any) => s.status === "cancelled").length;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">💎 訂閱管理</h2>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="MRR" value={`NT$ ${mrr.toLocaleString()}`} color="text-yellow-400" />
        <Stat label="活躍訂閱" value={activeSubsAll.length} color="text-green-400" />
        <Stat label="已取消（總）" value={churned} color="text-red-400" />
      </div>

      <div className="flex gap-2 text-sm">
        <FilterLink href="/admin/subscriptions" active={!params.status}>全部</FilterLink>
        <FilterLink href="/admin/subscriptions?status=active" active={params.status === "active"}>活躍</FilterLink>
        <FilterLink href="/admin/subscriptions?status=cancelled" active={params.status === "cancelled"}>已取消</FilterLink>
        <FilterLink href="/admin/subscriptions?status=past_due" active={params.status === "past_due"}>過期</FilterLink>
      </div>

      {error?.message?.includes("does not exist") ? (
        <SchemaNeeded />
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-elevated)] text-left text-xs text-[var(--color-fg-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">用戶</th>
                <th className="px-4 py-3">方案</th>
                <th className="px-4 py-3">月費</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">開始</th>
                <th className="px-4 py-3">到期</th>
              </tr>
            </thead>
            <tbody>
              {subs?.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-fg-muted)]">目前沒有訂閱</td></tr>
              ) : (
                subs?.map((s: any) => (
                  <tr key={s.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users?q=${s.profiles?.username}`} className="hover:text-[var(--color-accent)]">
                        {s.profiles?.display_name || s.profiles?.username || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><PlanBadge plan={s.plan} /></td>
                    <td className="px-4 py-3">NT$ {s.plan_price?.toLocaleString() ?? 0}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">{new Date(s.started_at).toLocaleDateString('zh-TW')}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">{s.expires_at ? new Date(s.expires_at).toLocaleDateString('zh-TW') : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href as any} className={`px-3 py-1.5 rounded-lg ${active ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-elevated)]"}`}>
      {children}
    </Link>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="text-xs text-[var(--color-fg-muted)]">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const labels: Record<string, string> = { free: "Free", premium: "Premium", lifetime: "Lifetime" };
  const colors: Record<string, string> = {
    free: "bg-gray-500/20 text-gray-400",
    premium: "bg-[var(--color-accent)]/20 text-[var(--color-accent)]",
    lifetime: "bg-yellow-500/20 text-yellow-400",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[plan] ?? ""}`}>{labels[plan] ?? plan}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    cancelled: "bg-gray-500/20 text-gray-400",
    past_due: "bg-red-500/20 text-red-400",
    expired: "bg-red-500/20 text-red-400",
  };
  const labels: Record<string, string> = {
    active: "活躍",
    cancelled: "已取消",
    past_due: "過期",
    expired: "已到期",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[status] ?? ""}`}>{labels[status] ?? status}</span>;
}

function SchemaNeeded() {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
      <div className="font-bold mb-2">⚠️ 需要先跑 admin migration</div>
      <code className="block bg-[var(--color-bg)] p-3 rounded text-xs">supabase/admin_migration.sql</code>
    </div>
  );
}
