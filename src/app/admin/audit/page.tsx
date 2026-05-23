import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    action?: string;
    actor?: string;
    target_type?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const from = sp.from || sevenDaysAgo.toISOString().slice(0, 10);
  const to = sp.to || new Date().toISOString().slice(0, 10);
  const action = sp.action || "all";
  const actor = sp.actor || "";
  const targetType = sp.target_type || "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const off = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdmin();

  const [{ data: allActionsRaw }, { data: allTargetsRaw }] = await Promise.all([
    supabase.from("audit_logs").select("action").limit(1000),
    supabase.from("audit_logs").select("target_type").limit(1000),
  ]);
  const distinctActions = Array.from(
    new Set((allActionsRaw ?? []).map((r: any) => r.action)),
  ).filter(Boolean).sort() as string[];
  const distinctTargets = Array.from(
    new Set((allTargetsRaw ?? []).map((r: any) => r.target_type)),
  ).filter(Boolean).sort() as string[];

  let q = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`);
  if (action !== "all") q = q.eq("action", action);
  if (actor) q = q.ilike("actor_username", `%${actor.replace(/[%,*()\\]/g, "")}%`);
  if (targetType !== "all") q = q.eq("target_type", targetType);
  const { data: logs, count, error } = await q
    .order("created_at", { ascending: false })
    .range(off, off + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { from, to, action, actor, target_type: targetType, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && !(k === "page" && v === "1")) params.set(k, v);
    }
    return adminHref("/admin/audit" + (params.toString() ? "?" + params.toString() : ""));
  };

  const exportParams = new URLSearchParams();
  exportParams.set("from", `${from}T00:00:00.000Z`);
  exportParams.set("to", `${to}T23:59:59.999Z`);
  if (action !== "all") exportParams.set("action", action);
  if (actor) exportParams.set("actor", actor);
  if (targetType !== "all") exportParams.set("target_type", targetType);
  const exportHref = `/api/admin/audit/export?${exportParams.toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">📝 操作紀錄</h2>
        <div className="text-xs text-fg-muted">
          匹配 {(count ?? 0).toLocaleString()} 筆 · 第 {page}/{totalPages} 頁
        </div>
      </div>

      {error?.message?.includes("does not exist") && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
          <div className="font-bold mb-2">⚠️ 需要先跑 admin migration</div>
          <code className="block bg-bg p-3 rounded text-xs">supabase/admin_migration.sql</code>
        </div>
      )}

      <form action={adminHref("/admin/audit")} className="bg-bg-card border border-border rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-xs text-fg-muted">日期</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="bg-bg border border-border rounded-lg px-2 py-1 text-xs"
          />
          <span className="text-fg-muted">→</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="bg-bg border border-border rounded-lg px-2 py-1 text-xs"
          />
          <select
            name="action"
            defaultValue={action}
            className="bg-bg border border-border rounded-lg px-2 py-1 text-xs"
          >
            <option value="all">所有動作</option>
            {distinctActions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            name="target_type"
            defaultValue={targetType}
            className="bg-bg border border-border rounded-lg px-2 py-1 text-xs"
          >
            <option value="all">所有目標</option>
            {distinctTargets.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            name="actor"
            defaultValue={actor}
            placeholder="operator username"
            className="bg-bg border border-border rounded-lg px-2 py-1 text-xs"
          />
          <button type="submit" className="px-3 py-1 text-xs bg-accent text-black font-bold rounded-lg">
            套用
          </button>
          <a
            href={exportHref}
            className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-bg-elevated"
            title="下載目前 filter 結果為 CSV"
          >
            ⬇ 匯出 CSV
          </a>
          <Link href={adminHref("/admin/audit") as any} className="text-xs text-fg-muted hover:text-fg ml-auto">
            清除
          </Link>
        </div>
      </form>

      {logs?.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center text-fg-muted">
          目前條件下沒有 audit log
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
              <tr>
                <th className="px-4 py-3">時間</th>
                <th className="px-4 py-3">操作者</th>
                <th className="px-4 py-3">動作</th>
                <th className="px-4 py-3">目標</th>
                <th className="px-4 py-3">變更</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((log: any) => (
                <tr key={log.id} className="border-t border-border hover:bg-bg-elevated">
                  <td className="px-4 py-3 text-xs text-fg-muted whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("zh-TW")}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.actor_username ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg-elevated">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.target_type && (
                      <span className="text-fg-muted">{log.target_type}:</span>
                    )}
                    <span className="ml-1 font-mono">{log.target_id?.slice?.(0, 8) ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-fg-muted max-w-xs">
                    {log.changes && (
                      <code className="block truncate" title={JSON.stringify(log.changes)}>
                        {JSON.stringify(log.changes).slice(0, 80)}
                      </code>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{log.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link
            href={page > 1 ? (buildHref({ page: String(page - 1) }) as any) : "#"}
            className={`px-3 py-1.5 rounded-lg border border-border ${page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}
          >
            ← 上一頁
          </Link>
          <span className="text-xs text-fg-muted px-3">{page} / {totalPages}</span>
          <Link
            href={page < totalPages ? (buildHref({ page: String(page + 1) }) as any) : "#"}
            className={`px-3 py-1.5 rounded-lg border border-border ${page >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}
          >
            下一頁 →
          </Link>
        </div>
      )}
    </div>
  );
}
