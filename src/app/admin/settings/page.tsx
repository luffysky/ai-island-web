import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { SettingsEditor } from "./SettingsEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createSupabaseAdmin();

  const { data: settings, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("key");

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ 需要先跑 admin migration</div>
        <code className="block bg-bg p-3 rounded text-xs">supabase/admin_migration.sql</code>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">⚙️ 系統設定</h2>
        <p className="text-sm text-fg-muted mt-1">
          全站設定、功能開關、定價、維護模式等。改完按「儲存」即時生效、所有設定變動都會寫進 audit log。
        </p>
      </div>
      <SettingsEditor initial={settings ?? []} />
    </div>
  );
}
