import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { PageHero, AdminStatCard } from "@/components/admin/PageHero";
import { RowActionButton } from "@/components/admin/RowActionButton";
import { AlertTriangle, Coins, Info } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";

type Tab = "orders" | "zcoin" | "subs";

export default async function FinanceWorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; q?: string; page?: string; user?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = params.tab === "zcoin" ? "zcoin" : params.tab === "subs" ? "subs" : "orders";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const supabase = createSupabaseAdmin();

  return (
    <div className="space-y-4">
      <PageHero
        icon={Coins}
        title="金流營運工作台"
        desc="訂單 / Z幣流水 / 訂閱 三合一。所有數字即時查 DB、可退款 / 取消（帳面）並寫 audit log。"
        gradient="from-emerald-500/10 via-yellow-500/10 to-amber-500/10"
        borderColor="border-emerald-500/30"
      />

      {/* Tab bar */}
      <div className="flex gap-2 text-sm border-b border-border pb-2">
        <TabLink tab="orders" active={tab === "orders"}>訂單</TabLink>
        <TabLink tab="zcoin" active={tab === "zcoin"}>Z幣流水</TabLink>
        <TabLink tab="subs" active={tab === "subs"}>訂閱管理</TabLink>
      </div>

      {tab === "orders" && <OrdersTab supabase={supabase} params={params} page={page} />}
      {tab === "zcoin" && <ZcoinTab supabase={supabase} params={params} page={page} />}
      {tab === "subs" && <SubsTab supabase={supabase} params={params} page={page} />}
    </div>
  );
}

/* ============================ 訂單 ============================ */
async function OrdersTab({ supabase, params, page }: { supabase: any; params: any; page: number }) {
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("orders")
    .select("*, profiles(username, display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (params.status) query = query.eq("status", params.status);
  if (params.q) query = query.or(`order_no.ilike.%${params.q}%,product_name.ilike.%${params.q}%`);

  const { data: orders, error, count } = await query;

  // 本月統計（即時）
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: monthOrders } = await supabase
    .from("orders")
    .select("amount, status")
    .gte("created_at", startOfMonth);

  const monthRevenue = monthOrders?.filter((o: any) => o.status === "paid").reduce((s: number, o: any) => s + o.amount, 0) ?? 0;
  const monthRefunded = monthOrders?.filter((o: any) => o.status === "refunded").reduce((s: number, o: any) => s + o.amount, 0) ?? 0;
  const paidCount = monthOrders?.filter((o: any) => o.status === "paid").length ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminStatCard label="本月總收入" value={`NT$ ${monthRevenue.toLocaleString()}`} color="text-emerald-400" hint={`${paidCount} 筆已付款`} />
        <AdminStatCard
          label="本月退款"
          value={`NT$ ${monthRefunded.toLocaleString()}`}
          color="text-red-400"
          hint={monthRevenue > 0 ? `退款率 ${(monthRefunded / monthRevenue * 100).toFixed(1)}%` : undefined}
        />
        <AdminStatCard
          label="本月訂單數"
          value={monthOrders?.length ?? 0}
          color="text-blue-400"
          hint={paidCount ? `平均單價 NT$ ${Math.round(monthRevenue / paidCount).toLocaleString()}` : undefined}
        />
      </div>

      {/* 退款說明 */}
      <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>「退款」只把訂單標記為 refunded + 記 audit、方便對帳統計。<b>實際退錢要到金流商後台手動操作</b>、本系統不碰金流。</span>
      </div>

      <div className="flex gap-2 text-sm flex-wrap">
        <FilterLink tab="orders" params={params} patch={{ status: undefined }} active={!params.status}>全部</FilterLink>
        <FilterLink tab="orders" params={params} patch={{ status: "paid" }} active={params.status === "paid"}>已付款</FilterLink>
        <FilterLink tab="orders" params={params} patch={{ status: "pending" }} active={params.status === "pending"}>待付款</FilterLink>
        <FilterLink tab="orders" params={params} patch={{ status: "refunded" }} active={params.status === "refunded"}>已退款</FilterLink>
        <FilterLink tab="orders" params={params} patch={{ status: "failed" }} active={params.status === "failed"}>失敗</FilterLink>
        <FilterLink tab="orders" params={params} patch={{ status: "cancelled" }} active={params.status === "cancelled"}>已取消</FilterLink>
      </div>

      {error?.message?.includes("does not exist") ? (
        <SchemaNeeded />
      ) : (
        <>
          <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
                <tr>
                  <th className="px-4 py-3">訂單號</th>
                  <th className="px-4 py-3">用戶</th>
                  <th className="px-4 py-3">商品</th>
                  <th className="px-4 py-3">金額</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">建立</th>
                  <th className="px-4 py-3">操作</th>
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
                        <Link href={`/${SLUG}/admin/users?q=${o.profiles?.username}`} className="hover:text-accent">
                          {o.profiles?.display_name || o.profiles?.username || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{o.product_name}</td>
                      <td className="px-4 py-3 font-semibold">NT$ {o.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-xs text-fg-muted">{new Date(o.created_at).toLocaleString("zh-TW")}</td>
                      <td className="px-4 py-3">
                        {o.status === "paid" ? (
                          <RowActionButton
                            endpoint={`/api/admin/orders/${o.id}/refund`}
                            label="退款"
                            confirmText={`確定把訂單 ${o.order_no}（NT$ ${o.amount?.toLocaleString()}）標記為已退款？\n這只改帳面、實際退錢要到金流商後台。`}
                            successLabel="已退款"
                          />
                        ) : (
                          <span className="text-[11px] text-fg-muted/60">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager tab="orders" params={params} page={page} total={count ?? 0} />
        </>
      )}
    </div>
  );
}

/* ============================ Z幣流水 ============================ */
async function ZcoinTab({ supabase, params, page }: { supabase: any; params: any; page: number }) {
  const from = (page - 1) * PAGE_SIZE;

  // 若有 user 過濾 → 先解析 username → id
  let userIds: string[] | null = null;
  if (params.user) {
    const { data: matched } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${params.user}%`)
      .limit(50);
    userIds = (matched ?? []).map((p: any) => p.id);
    if (userIds!.length === 0) userIds = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabase
    .from("coin_transactions")
    .select("*, profiles(username, display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (userIds) query = query.in("user_id", userIds);

  const { data: txs, count } = await query;

  // 即時統計：總流通 + 本月流入流出
  const { data: profiles } = await supabase.from("profiles").select("z_coin");
  const totalCirculating = profiles?.reduce((s: number, p: any) => s + (p.z_coin ?? 0), 0) ?? 0;

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: monthTxs } = await supabase
    .from("coin_transactions")
    .select("amount")
    .gte("created_at", startOfMonth);
  const inflow = monthTxs?.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0) ?? 0;
  const outflow = monthTxs?.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0) ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminStatCard label="總流通量" value={totalCirculating.toLocaleString()} color="text-yellow-400" hint="所有 user 帳戶總和" />
        <AdminStatCard label="本月發放" value={`+${inflow.toLocaleString()}`} color="text-green-400" />
        <AdminStatCard label="本月消耗" value={`-${outflow.toLocaleString()}`} color="text-red-400" />
      </div>

      {/* user 過濾 */}
      <form className="flex gap-2 text-sm" action={`/${SLUG}/admin/orders`} method="get">
        <input type="hidden" name="tab" value="zcoin" />
        <input
          name="user"
          defaultValue={params.user ?? ""}
          placeholder="用 username 過濾流水…"
          className="px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm w-64"
        />
        <button type="submit" className="px-3 py-1.5 rounded-lg bg-accent text-black text-sm">過濾</button>
        {params.user && (
          <Link href={`/${SLUG}/admin/orders?tab=zcoin`} className="px-3 py-1.5 rounded-lg bg-bg-card border border-border">清除</Link>
        )}
      </form>

      <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
            <tr>
              <th className="px-4 py-3">用戶</th>
              <th className="px-4 py-3">金額</th>
              <th className="px-4 py-3">餘額後</th>
              <th className="px-4 py-3">說明</th>
              <th className="px-4 py-3">時間</th>
            </tr>
          </thead>
          <tbody>
            {txs?.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-fg-muted">沒有交易紀錄</td></tr>
            ) : (
              txs?.map((t: any) => (
                <tr key={t.id} className="border-t border-border hover:bg-bg-elevated">
                  <td className="px-4 py-3">
                    <Link href={`/${SLUG}/admin/users?q=${t.profiles?.username}`} className="hover:text-accent">
                      {t.profiles?.display_name || t.profiles?.username || "—"}
                    </Link>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${t.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {t.amount > 0 ? "+" : ""}{t.amount}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{t.balance_after ?? "—"}</td>
                  <td className="px-4 py-3 text-fg-muted">{t.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{new Date(t.created_at).toLocaleString("zh-TW")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager tab="zcoin" params={params} page={page} total={count ?? 0} />
    </div>
  );
}

/* ============================ 訂閱 ============================ */
async function SubsTab({ supabase, params, page }: { supabase: any; params: any; page: number }) {
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("subscriptions")
    .select("*, profiles(username, display_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (params.status) query = query.eq("status", params.status);

  const { data: subs, error, count } = await query;

  // 即時 MRR（所有 active、不受分頁影響）
  const { data: activeAll } = await supabase
    .from("subscriptions")
    .select("plan_price")
    .eq("status", "active");
  const mrr = (activeAll ?? []).reduce((s: number, x: any) => s + (x.plan_price ?? 0), 0);
  const activeCount = activeAll?.length ?? 0;

  const { count: churnedCount } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "cancelled");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminStatCard label="MRR" value={`NT$ ${mrr.toLocaleString()}`} color="text-yellow-400" hint={`${activeCount} 個有效訂閱`} />
        <AdminStatCard label="活躍訂閱" value={activeCount} color="text-emerald-400" />
        <AdminStatCard
          label="已取消 (總)"
          value={churnedCount ?? 0}
          color="text-red-400"
          hint={activeCount + (churnedCount ?? 0) > 0 ? `流失率 ${((churnedCount ?? 0) / (activeCount + (churnedCount ?? 0)) * 100).toFixed(1)}%` : undefined}
        />
      </div>

      <div className="flex gap-2 text-sm flex-wrap">
        <FilterLink tab="subs" params={params} patch={{ status: undefined }} active={!params.status}>全部</FilterLink>
        <FilterLink tab="subs" params={params} patch={{ status: "active" }} active={params.status === "active"}>活躍</FilterLink>
        <FilterLink tab="subs" params={params} patch={{ status: "cancelled" }} active={params.status === "cancelled"}>已取消</FilterLink>
        <FilterLink tab="subs" params={params} patch={{ status: "past_due" }} active={params.status === "past_due"}>過期</FilterLink>
      </div>

      {error?.message?.includes("does not exist") ? (
        <SchemaNeeded />
      ) : (
        <>
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
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {subs?.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-fg-muted">目前沒有訂閱</td></tr>
                ) : (
                  subs?.map((s: any) => (
                    <tr key={s.id} className="border-t border-border hover:bg-bg-elevated">
                      <td className="px-4 py-3">
                        <Link href={`/${SLUG}/admin/users?q=${s.profiles?.username}`} className="hover:text-accent">
                          {s.profiles?.display_name || s.profiles?.username || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><PlanBadge plan={s.plan} /></td>
                      <td className="px-4 py-3">NT$ {s.plan_price?.toLocaleString() ?? 0}</td>
                      <td className="px-4 py-3"><SubStatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-xs text-fg-muted">{s.started_at ? new Date(s.started_at).toLocaleDateString("zh-TW") : "—"}</td>
                      <td className="px-4 py-3 text-xs text-fg-muted">{s.expires_at ? new Date(s.expires_at).toLocaleDateString("zh-TW") : "—"}</td>
                      <td className="px-4 py-3">
                        {s.status !== "cancelled" ? (
                          <RowActionButton
                            endpoint={`/api/admin/subscriptions/${s.id}/cancel`}
                            label="取消訂閱"
                            confirmText={`確定取消此訂閱（${s.plan}）？\n這只改帳面狀態、定期扣款需另外到金流商停止。`}
                            successLabel="已取消"
                          />
                        ) : (
                          <span className="text-[11px] text-fg-muted/60">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager tab="subs" params={params} page={page} total={count ?? 0} />
        </>
      )}
    </div>
  );
}

/* ============================ 共用小元件 ============================ */
function buildHref(tab: Tab, params: any, patch: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  sp.set("tab", tab);
  // 保留同 tab 的既有過濾（status / q / user）
  for (const k of ["status", "q", "user"]) {
    if (params[k] != null && params[k] !== "") sp.set(k, String(params[k]));
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) sp.delete(k);
    else sp.set(k, String(v));
  }
  return `/${SLUG}/admin/orders?${sp.toString()}`;
}

function TabLink({ tab, active, children }: { tab: Tab; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={`/${SLUG}/admin/orders?tab=${tab}`}
      className={`px-4 py-1.5 rounded-lg font-medium ${active ? "bg-accent text-black" : "bg-bg-card hover:bg-bg-elevated"}`}
    >
      {children}
    </Link>
  );
}

function FilterLink({ tab, params, patch, active, children }: { tab: Tab; params: any; patch: Record<string, string | undefined>; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={buildHref(tab, params, { ...patch, page: undefined }) as any} className={`px-3 py-1.5 rounded-lg ${active ? "bg-accent text-black" : "bg-bg-card hover:bg-bg-elevated"}`}>
      {children}
    </Link>
  );
}

function Pager({ tab, params, page, total }: { tab: Tab; params: any; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-xs text-fg-muted">共 {total.toLocaleString()} 筆、第 {page} / {pages} 頁</span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={buildHref(tab, params, { page: page - 1 }) as any} className="px-3 py-1.5 rounded-lg bg-bg-card border border-border hover:bg-bg-elevated">上一頁</Link>
        )}
        {page < pages && (
          <Link href={buildHref(tab, params, { page: page + 1 }) as any} className="px-3 py-1.5 rounded-lg bg-bg-card border border-border hover:bg-bg-elevated">下一頁</Link>
        )}
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: "bg-green-500/20 text-green-900 dark:text-green-200",
    pending: "bg-yellow-500/20 text-yellow-900 dark:text-yellow-200",
    refunded: "bg-red-500/20 text-red-900 dark:text-red-200",
    cancelled: "bg-gray-500/20 text-gray-900 dark:text-gray-200",
    failed: "bg-red-500/20 text-red-900 dark:text-red-200",
  };
  const labels: Record<string, string> = { paid: "已付款", pending: "待付款", refunded: "已退款", cancelled: "已取消", failed: "失敗" };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[status] ?? "bg-gray-500/20"}`}>{labels[status] ?? status}</span>;
}

function SubStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/20 text-green-900 dark:text-green-200",
    cancelled: "bg-gray-500/20 text-gray-900 dark:text-gray-200",
    past_due: "bg-red-500/20 text-red-900 dark:text-red-200",
    expired: "bg-red-500/20 text-red-900 dark:text-red-200",
  };
  const labels: Record<string, string> = { active: "活躍", cancelled: "已取消", past_due: "過期", expired: "已到期" };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[status] ?? ""}`}>{labels[status] ?? status}</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  const labels: Record<string, string> = { free: "Free", premium: "Premium", monthly: "月訂", yearly: "年訂", lifetime: "Lifetime" };
  const colors: Record<string, string> = {
    free: "bg-gray-500/20 text-gray-900 dark:text-gray-200",
    premium: "bg-accent/20 text-accent",
    monthly: "bg-accent/20 text-accent",
    yearly: "bg-cyan-500/20 text-cyan-900 dark:text-cyan-200",
    lifetime: "bg-yellow-500/20 text-yellow-900 dark:text-yellow-200",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[plan] ?? ""}`}>{labels[plan] ?? plan}</span>;
}

function SchemaNeeded() {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
      <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 需要先跑 admin migration</div>
      <code className="block bg-bg p-3 rounded text-xs">supabase/admin_migration.sql</code>
    </div>
  );
}
