import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { PageHero, AdminStatCard } from "@/components/admin/PageHero";

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
      <PageHero
        emoji="💎"
        title="訂閱管理"
        desc="所有月訂 / 年訂 / 終身訂閱、可看狀態 / 升降級 / 流失。MRR 跟活躍訂閱數即時計算。"
        gradient="from-yellow-500/10 via-amber-500/10 to-pink-500/10"
        borderColor="border-yellow-500/30"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminStatCard label="MRR" value={`NT$ ${mrr.toLocaleString()}`} color="text-yellow-400" hint={`${activeSubsAll.length} 個有效訂閱`} />
        <AdminStatCard label="活躍訂閱" value={activeSubsAll.length} color="text-emerald-400" />
        <AdminStatCard label="已取消 (總)" value={churned} color="text-red-400" hint={activeSubsAll.length > 0 ? `流失率 ${(churned/(churned+activeSubsAll.length)*100).toFixed(1)}%` : undefined} />
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
        <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
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
                <tr><td colSpan={6} className="px-4 py-8 text-center text-fg-muted">目前沒有訂閱</td></tr>
              ) : (
                subs?.map((s: any) => (
                  <tr key={s.id} className="border-t border-border hover:bg-bg-elevated">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users?q=${s.profiles?.username}`} className="hover:text-accent">
                        {s.profiles?.display_name || s.profiles?.username || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><PlanBadge plan={s.plan} /></td>
                    <td className="px-4 py-3">NT$ {s.plan_price?.toLocaleString() ?? 0}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-xs text-fg-muted">{new Date(s.started_at).toLocaleDateString('zh-TW')}</td>
                    <td className="px-4 py-3 text-xs text-fg-muted">{s.expires_at ? new Date(s.expires_at).toLocaleDateString('zh-TW') : "—"}</td>
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
    <Link href={(href.startsWith("/admin") ? href.replace(/^\/admin/, `/${process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2"}/admin`) : href) as any} className={`px-3 py-1.5 rounded-lg ${active ? "bg-accent text-black" : "bg-bg-card hover:bg-bg-elevated"}`}>
      {children}
    </Link>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const labels: Record<string, string> = { free: "Free", premium: "Premium", lifetime: "Lifetime" };
  const colors: Record<string, string> = {
    free: "bg-gray-500/20 text-gray-900 dark:text-gray-200",
    premium: "bg-accent/20 text-accent",
    lifetime: "bg-yellow-500/20 text-yellow-900 dark:text-yellow-200",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[plan] ?? ""}`}>{labels[plan] ?? plan}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/20 text-green-900 dark:text-green-200",
    cancelled: "bg-gray-500/20 text-gray-900 dark:text-gray-200",
    past_due: "bg-red-500/20 text-red-900 dark:text-red-200",
    expired: "bg-red-500/20 text-red-900 dark:text-red-200",
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
      <code className="block bg-bg p-3 rounded text-xs">supabase/admin_migration.sql</code>
    </div>
  );
}
