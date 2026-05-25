import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NotificationMatrix } from "./NotificationMatrix";
import { Hint } from "@/components/ui/Hint";
import { PageHero } from "@/components/admin/PageHero";

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
      <PageHero
        emoji="🔔"
        title="通知設定"
        desc="每個事件分別設定走哪個 channel (站內鈴鐺 / Email / LINE / PWA 推播)、改完 60 秒 cache 後生效。"
        gradient="from-cyan-500/10 via-sky-500/10 to-blue-500/10"
        borderColor="border-cyan-500/30"
      />
      <header className="hidden">
        <h1 className="text-2xl font-bold flex items-center gap-2">🔔 通知設定</h1>
        <p className="text-sm text-fg-muted mt-1">
          每個事件可分別設定走哪個{" "}
          <span className="inline-flex items-center">
            channel
            <Hint title="Channel（通知管道）">
              用什麼方式通知 user。一個事件可以同時走多個 channel：站內鈴鐺、Email、LINE、PWA 推播。例如「客服回覆」可以同時站內 + LINE。
            </Hint>
          </span>
          。改完即時生效（60 秒 cache、就是 60 秒內後台會記住設定、之後第一筆通知會用新的）。
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
