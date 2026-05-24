import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const CHECKS: Array<{ table: string; cols?: string[]; migration: string; required_for: string }> = [
  { table: "profiles", cols: ["line_user_id", "line_notify_enabled"], migration: "user_line_bind_migration.sql", required_for: "LINE 綁定" },
  { table: "tickets", cols: ["meta"], migration: "tickets_meta_migration.sql ⚠️", required_for: "LINE 客服 / CRM" },
  { table: "ticket_messages", cols: ["body", "is_staff", "meta"], migration: "tickets_meta_migration.sql ⚠️", required_for: "客服回覆 / LINE webhook 自動建單" },
  { table: "canned_replies", migration: "canned_replies_migration.sql", required_for: "罐頭回覆" },
  { table: "media_assets", migration: "media_assets_migration.sql", required_for: "R2 圖片上傳" },
  { table: "content_embeddings", migration: "semantic_search_migration.sql", required_for: "語意搜尋" },
  { table: "broadcasts", migration: "admin_migration.sql", required_for: "公告 / 群發" },
  { table: "audit_logs", migration: "admin_migration.sql", required_for: "操作紀錄" },
  { table: "notifications", migration: "notifications_migration.sql", required_for: "站內通知" },
  { table: "line_bind_codes", migration: "user_line_bind_migration.sql", required_for: "user LINE 綁定 code" },
  { table: "orders", migration: "commerce_migration.sql", required_for: "訂單" },
  { table: "subscriptions", migration: "commerce_migration.sql", required_for: "訂閱" },
  { table: "blog_posts", migration: "blog_migration.sql", required_for: "部落格" },
  { table: "forum_threads", migration: "forum_migration.sql", required_for: "論壇" },
  { table: "error_logs", migration: "error_log_migration.sql", required_for: "錯誤日誌" },
  { table: "rate_limits", migration: "rate_limit_migration.sql", required_for: "rate limit" },
];

export default async function AdminDbCheckPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const admin = createSupabaseAdmin();
  const results: any[] = [];
  for (const c of CHECKS) {
    const row: any = { ...c };
    try {
      const { error } = await admin.from(c.table).select("*", { count: "exact", head: true });
      if (error) {
        row.exists = false;
        row.error = error.message;
      } else {
        row.exists = true;
        if (c.cols && c.cols.length > 0) {
          const { error: colErr } = await admin.from(c.table).select(c.cols.join(",")).limit(1);
          if (colErr) {
            row.cols_ok = false;
            row.col_error = colErr.message;
          } else {
            row.cols_ok = true;
          }
        }
      }
    } catch (e: any) {
      row.exists = false;
      row.error = e?.message;
    }
    results.push(row);
  }

  const pending = results.filter((r) => !r.exists || r.cols_ok === false);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🩺 DB 狀態檢查</h1>
        <p className="text-sm text-fg-muted mt-1">
          一次列出所有表 / 關鍵欄位是否存在、紅色那行就是 migration 還沒跑。
        </p>
      </header>

      {pending.length > 0 ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="font-bold text-red-400">
            ⚠️ {pending.length} 個 migration 需要跑
          </div>
          <ul className="mt-2 text-sm space-y-1">
            {pending.map((p, i) => (
              <li key={i} className="flex items-center gap-2 flex-wrap">
                <code className="text-xs bg-bg px-2 py-0.5 rounded">{p.table}</code>
                {!p.exists ? <span className="text-red-300 text-xs">表不存在</span> : <span className="text-yellow-400 text-xs">欄位缺：{p.cols?.join(", ")}</span>}
                <span className="text-fg-muted text-xs">→ 跑</span>
                <code className="text-xs text-accent">{p.migration}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm">
          ✅ 所有表 / 欄位都到位
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
            <tr>
              <th className="px-3 py-2">表</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">用途</th>
              <th className="px-3 py-2">Migration</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const ok = r.exists && r.cols_ok !== false;
              return (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{r.table}</td>
                  <td className="px-3 py-2">
                    {ok ? (
                      <span className="text-green-400 text-xs">✅ OK</span>
                    ) : !r.exists ? (
                      <span className="text-red-400 text-xs">❌ 表不存在</span>
                    ) : (
                      <span className="text-yellow-400 text-xs">⚠️ 缺欄位：{r.cols?.join(", ")}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-fg-muted">{r.required_for}</td>
                  <td className="px-3 py-2 text-xs">
                    <code className="text-accent">{r.migration}</code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-4 text-xs text-fg-muted space-y-1">
        <div className="font-bold text-fg">怎麼跑 migration？</div>
        <div>1. 開 Supabase Dashboard → SQL Editor</div>
        <div>2. 把 <code className="bg-bg px-1 rounded">supabase/&lt;migration&gt;.sql</code> 整檔貼進去</div>
        <div>3. Run → 跑完回這頁刷新</div>
      </div>
    </div>
  );
}
