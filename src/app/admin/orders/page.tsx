import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { PageHero, AdminStatCard } from "@/components/admin/PageHero";
import { AlertTriangle } from "lucide-react";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const params = await searchParams;
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("orders")
    .select("*, profiles(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.status) query = query.eq("status", params.status);
  if (params.q) query = query.or(`order_no.ilike.%${params.q}%,product_name.ilike.%${params.q}%`);

  const { data: orders, error } = await query;

  // 統計
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: monthOrders } = await supabase
    .from("orders")
    .select("amount, status")
    .gte("created_at", startOfMonth);

  const monthRevenue = monthOrders?.filter((o: any) => o.status === "paid").reduce((s: number, o: any) => s + o.amount, 0) ?? 0;
  const monthRefunded = monthOrders?.filter((o: any) => o.status === "refunded").reduce((s: number, o: any) => s + o.amount, 0) ?? 0;

  return (
    <div className="space-y-4">
      <PageHero
        emoji="💰"
        title="訂單管理"
        desc={`近 100 筆訂單、依狀態 / 關鍵字 搜尋。本月 ${monthOrders?.length ?? 0} 筆訂單。`}
        gradient="from-emerald-500/10 via-yellow-500/10 to-amber-500/10"
        borderColor="border-emerald-500/30"
      />

      {/* 統計 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminStatCard label="本月總收入" value={`NT$ ${monthRevenue.toLocaleString()}`} color="text-emerald-400" />
        <AdminStatCard
          label="本月退款"
          value={`NT$ ${monthRefunded.toLocaleString()}`}
          color="text-red-400"
          hint={monthRevenue > 0 ? `退款率 ${(monthRefunded/monthRevenue*100).toFixed(1)}%` : undefined}
        />
        <AdminStatCard
          label="本月訂單數"
          value={monthOrders?.length ?? 0}
          color="text-blue-400"
          hint={monthOrders?.length ? `平均單價 NT$ ${Math.round(monthRevenue/(monthOrders.filter((o:any)=>o.status==="paid").length || 1)).toLocaleString()}` : undefined}
        />
      </div>

      {/* 過濾 */}
      <div className="flex gap-2 text-sm">
        <FilterLink href="/admin/orders" active={!params.status}>全部</FilterLink>
        <FilterLink href="/admin/orders?status=paid" active={params.status === "paid"}>已付款</FilterLink>
        <FilterLink href="/admin/orders?status=pending" active={params.status === "pending"}>待付款</FilterLink>
        <FilterLink href="/admin/orders?status=refunded" active={params.status === "refunded"}>已退款</FilterLink>
        <FilterLink href="/admin/orders?status=cancelled" active={params.status === "cancelled"}>已取消</FilterLink>
      </div>

      {/* 表格 */}
      {error?.message?.includes("does not exist") ? (
        <SchemaNeeded />
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
              <tr>
                <th className="px-4 py-3">訂單號</th>
                <th className="px-4 py-3">用戶</th>
                <th className="px-4 py-3">商品</th>
                <th className="px-4 py-3">金額</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">付款</th>
                <th className="px-4 py-3">建立</th>
              </tr>
            </thead>
            <tbody>
              {orders?.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-fg-muted">目前沒有訂單</td></tr>
              ) : (
                orders?.map((o: any) => (
                  <tr key={o.id} className="border-t border-border hover:bg-bg-elevated">
                    <td className="px-4 py-3 font-mono text-xs">{o.order_no}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users?q=${o.profiles?.username}`} className="hover:text-accent">
                        {o.profiles?.display_name || o.profiles?.username || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.product_name}</td>
                    <td className="px-4 py-3 font-semibold">NT$ {o.amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-fg-muted">{o.payment_method ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-fg-muted">{new Date(o.created_at).toLocaleString('zh-TW')}</td>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: "bg-green-500/20 text-green-900 dark:text-green-200",
    pending: "bg-yellow-500/20 text-yellow-900 dark:text-yellow-200",
    refunded: "bg-red-500/20 text-red-900 dark:text-red-200",
    cancelled: "bg-gray-500/20 text-gray-900 dark:text-gray-200",
    failed: "bg-red-500/20 text-red-900 dark:text-red-200",
  };
  const labels: Record<string, string> = {
    paid: "已付款",
    pending: "待付款",
    refunded: "已退款",
    cancelled: "已取消",
    failed: "失敗",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[status] ?? "bg-gray-500/20"}`}>{labels[status] ?? status}</span>;
}

function SchemaNeeded() {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
      <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 需要先跑 admin migration</div>
      <p className="mb-3 text-fg-muted">
        訂單功能需要的 table 還沒建立。請去 Supabase Dashboard → SQL Editor、跑：
      </p>
      <code className="block bg-bg p-3 rounded text-xs">supabase/admin_migration.sql</code>
    </div>
  );
}
