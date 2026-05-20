import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function RedirectsPage() {
  const supabase = createSupabaseAdmin();

  const { data: redirects, error } = await supabase
    .from("seo_redirects")
    .select("*")
    .order("hits", { ascending: false });

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ 需要先跑 ai_migration.sql</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">↪️ 轉址管理</h2>
        <button className="px-4 py-2 bg-[var(--color-accent)] text-black rounded-lg font-semibold text-sm">
          + 新增轉址
        </button>
      </div>
      <p className="text-sm text-[var(--color-fg-muted)]">301 / 302 轉址、避免 404 影響 SEO</p>

      {!redirects || redirects.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center text-[var(--color-fg-muted)]">
          還沒有轉址規則
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-elevated)] text-left text-xs text-[var(--color-fg-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">命中次數</th>
                <th className="px-4 py-3">啟用</th>
              </tr>
            </thead>
            <tbody>
              {redirects.map((r: any) => (
                <tr key={r.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 font-mono text-xs">{r.from_path}</td>
                  <td className="px-4 py-3 font-mono text-xs">→ {r.to_path}</td>
                  <td className="px-4 py-3">{r.status_code}</td>
                  <td className="px-4 py-3">{r.hits}</td>
                  <td className="px-4 py-3">{r.enabled ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
