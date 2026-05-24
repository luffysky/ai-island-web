import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AppSettingsClient } from "./AppSettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminAppSettingsPage() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("app_settings")
    .select("*")
    .order("category", { ascending: true })
    .order("key", { ascending: true });

  if (error) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ 需要先跑 migration（補 category / is_secret / value_type）</div>
        <code className="block bg-bg p-3 rounded text-xs mb-2">
          supabase/app_settings_extend_migration.sql
        </code>
        <div className="text-xs text-fg-muted">錯誤：{error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">⚙️ 應用設定 CRUD</h1>
        <p className="text-sm text-fg-muted mt-1 leading-relaxed">
          DB-backed runtime config、改完即時生效（60 秒 cache）、不用 Zeabur redeploy。
          <br />
          <span className="text-yellow-400 text-xs">
            ⚠️ 系統 secret (SUPABASE_*, AI_KEY_SECRET, AI Provider keys) 仍須走{" "}
            <a href="/admin/env" className="underline">/admin/env</a>{" "}
            (Zeabur env)、不放這。
          </span>
        </p>
      </header>

      <AppSettingsClient initial={(data as any) ?? []} />
    </div>
  );
}
