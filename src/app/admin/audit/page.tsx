import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function AuditPage() {
  const supabase = createSupabaseAdmin();

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">📝 操作紀錄</h2>
      <p className="text-sm text-[var(--color-fg-muted)]">最近 200 筆 admin 操作。用來追蹤誰改了什麼、何時改的。</p>

      {error?.message?.includes("does not exist") ? (
        <SchemaNeeded />
      ) : logs?.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center text-[var(--color-fg-muted)]">
          還沒有操作紀錄
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-elevated)] text-left text-xs text-[var(--color-fg-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">時間</th>
                <th className="px-4 py-3">操作者</th>
                <th className="px-4 py-3">動作</th>
                <th className="px-4 py-3">目標</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((log: any) => (
                <tr key={log.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]">
                  <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
                    {new Date(log.created_at).toLocaleString('zh-TW')}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.actor_username ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-bg-elevated)]">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.target_type && (
                      <span className="text-[var(--color-fg-muted)]">{log.target_type}:</span>
                    )}
                    <span className="ml-1 font-mono">{log.target_id ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">{log.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SchemaNeeded() {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
      <div className="font-bold mb-2">⚠️ 需要先跑 admin migration</div>
      <code className="block bg-[var(--color-bg)] p-3 rounded text-xs">supabase/admin_migration.sql</code>
    </div>
  );
}
