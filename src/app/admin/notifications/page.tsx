import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NotificationMatrix } from "./NotificationMatrix";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("notification_settings")
    .select("*")
    .order("category", { ascending: true })
    .order("event_key", { ascending: true });

  if (error) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ 需要先跑 migration</div>
        <code className="block bg-bg p-3 rounded text-xs mb-2">
          supabase/notification_settings_migration.sql
        </code>
        <div className="text-xs text-fg-muted">錯誤：{error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🔔 通知設定</h1>
        <p className="text-sm text-fg-muted mt-1">
          每個事件可分別設定走哪個 channel。改完即時生效（60 秒 cache）。
          <br />
          <span className="text-yellow-400 text-xs">
            ⚠️ 標 v2 的事件還沒實際接上、設定先存著、之後 module 接上會讀此表。
          </span>
        </p>
      </header>

      <NotificationMatrix initial={(data as any) ?? []} />
    </div>
  );
}
