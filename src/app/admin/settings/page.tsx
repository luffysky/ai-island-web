import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function SettingsPage() {
  const supabase = createSupabaseAdmin();

  const { data: settings, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("key");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">⚙️ 系統設定</h2>
      <p className="text-sm text-[var(--color-fg-muted)]">全站設定、功能開關、定價等。修改後立即生效。</p>

      {error?.message?.includes("does not exist") ? (
        <SchemaNeeded />
      ) : (
        <div className="space-y-3">
          {settings?.map((s: any) => (
            <div key={s.key} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-bold mb-1">{s.key}</div>
                  {s.description && <p className="text-xs text-[var(--color-fg-muted)] mb-2">{s.description}</p>}
                  <pre className="text-xs bg-[var(--color-bg)] p-3 rounded overflow-x-auto">
                    {JSON.stringify(s.value, null, 2)}
                  </pre>
                </div>
                <button className="text-xs px-3 py-1 bg-[var(--color-bg-elevated)] rounded hover:bg-[var(--color-border)] flex-shrink-0">
                  ✏️ 編輯
                </button>
              </div>
              {s.updated_at && (
                <div className="text-xs text-[var(--color-fg-muted)] mt-2">
                  最後修改：{new Date(s.updated_at).toLocaleString('zh-TW')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm">
        <div className="font-bold mb-2">💡 編輯功能 TODO</div>
        <p className="text-[var(--color-fg-muted)]">目前是唯讀預覽、可直接到 Supabase SQL Editor 改 `app_settings` 表。下版加 inline JSON editor。</p>
      </div>
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
