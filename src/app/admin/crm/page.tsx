import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CRMPage({ searchParams }: { searchParams: Promise<{ status?: string; priority?: string }> }) {
  const params = await searchParams;
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("tickets")
    .select("*, profiles(username, display_name, avatar_url)")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (params.status) query = query.eq("status", params.status);
  if (params.priority) query = query.eq("priority", params.priority);

  const { data: tickets, error } = await query;

  const open = tickets?.filter((t: any) => t.status === "open").length ?? 0;
  const pending = tickets?.filter((t: any) => t.status === "pending").length ?? 0;
  const urgent = tickets?.filter((t: any) => t.priority === "urgent" && t.status !== "resolved").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">💬 客服 (CRM)</h2>
      </div>

      <div className="rounded-xl bg-blue-500/5 border border-blue-500/30 p-3 text-xs text-fg-muted">
        這頁是<b className="text-fg"> 對話客服 </b>：點 ticket 進去聊天 + 套罐頭 + 自動推 LINE。
        要批次改狀態 / 派單 / SLA、請去{" "}
        <Link href={(`/${process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2"}/admin/tickets`) as any} className="text-accent hover:underline font-bold">
          /admin/tickets 工單管理
        </Link>。
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="待處理" value={open} color="text-red-400" />
        <Stat label="等待回覆" value={pending} color="text-yellow-400" />
        <Stat label="緊急" value={urgent} color="text-red-500" />
      </div>

      <div className="flex gap-2 text-sm flex-wrap">
        <FilterLink href="/admin/crm" active={!params.status}>全部</FilterLink>
        <FilterLink href="/admin/crm?status=open" active={params.status === "open"}>待處理</FilterLink>
        <FilterLink href="/admin/crm?status=pending" active={params.status === "pending"}>等回覆</FilterLink>
        <FilterLink href="/admin/crm?status=resolved" active={params.status === "resolved"}>已解決</FilterLink>
        <div className="border-l border-border mx-1" />
        <FilterLink href="/admin/crm?priority=urgent" active={params.priority === "urgent"}>🔥 緊急</FilterLink>
        <FilterLink href="/admin/crm?priority=high" active={params.priority === "high"}>高</FilterLink>
      </div>

      {error?.message?.includes("does not exist") ? (
        <SchemaNeeded />
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
              <tr>
                <th className="px-4 py-3">主旨</th>
                <th className="px-4 py-3">用戶</th>
                <th className="px-4 py-3">類別</th>
                <th className="px-4 py-3">優先度</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">最近回覆</th>
              </tr>
            </thead>
            <tbody>
              {tickets?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-2">
                    <EmptyState emoji="💌" title="目前沒有客服 ticket" desc="使用者從 /support 開單後會出現在這" />
                  </td>
                </tr>
              ) : (
                tickets?.map((t: any) => {
                  const isLine = t.meta?.source === "user_line_bot";
                  const senderName = t.profiles?.display_name || t.profiles?.username || t.meta?.sender_name || "LINE訪客";
                  return (
                  <tr key={t.id} className="border-t border-border hover:bg-bg-elevated">
                    <td className="px-4 py-3">
                      <Link href={`/${process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2"}/admin/crm/${t.id}` as any} className="hover:text-accent font-medium inline-flex items-center gap-1.5">
                        {isLine && <span className="text-[10px] px-1 rounded bg-green-500/15 text-green-400">💚 LINE</span>}
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-sm">{senderName}</td>
                    <td className="px-4 py-3"><CategoryBadge cat={t.category} /></td>
                    <td className="px-4 py-3"><PriorityBadge p={t.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-xs text-fg-muted">
                      {t.last_replied_at ? new Date(t.last_replied_at).toLocaleString('zh-TW') : "—"}
                    </td>
                  </tr>
                  );
                })
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

function CategoryBadge({ cat }: { cat: string | null }) {
  if (!cat) return <span className="text-fg-muted text-xs">—</span>;
  const labels: Record<string, string> = { bug: "🐛 Bug", feature: "💡 功能", billing: "💰 帳務", content: "📚 內容", other: "其他" };
  return <span className="text-xs">{labels[cat] ?? cat}</span>;
}

function PriorityBadge({ p }: { p: string }) {
  const colors: Record<string, string> = {
    low: "text-gray-400",
    normal: "text-blue-400",
    high: "text-orange-400",
    urgent: "text-red-500 font-bold",
  };
  const labels: Record<string, string> = { low: "低", normal: "普通", high: "高", urgent: "緊急" };
  return <span className={`text-xs ${colors[p]}`}>{labels[p] ?? p}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-red-500/20 text-red-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    resolved: "bg-green-500/20 text-green-400",
    closed: "bg-gray-500/20 text-gray-400",
  };
  const labels: Record<string, string> = { open: "待處理", pending: "等回覆", resolved: "已解決", closed: "已關閉" };
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
