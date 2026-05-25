import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AppSettingsClient } from "./AppSettingsClient";
import { Hint } from "@/components/ui/Hint";

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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          ⚙️ 應用設定
          <span className="inline-flex items-center text-base">
            CRUD
            <Hint title="CRUD">
              Create / Read / Update / Delete — 新增、讀取、修改、刪除四種操作的縮寫。簡單講：這頁可以增、改、刪設定值。
            </Hint>
          </span>
        </h1>
        <p className="text-sm text-fg-muted mt-1 leading-relaxed">
          這頁設定值<b>存在資料庫裡</b>、改完
          <span className="inline-flex items-center">
            即時生效（60 秒 cache）
            <Hint title="60 秒 cache">
              系統每 60 秒重新讀一次設定值。意思：你改完之後、最多 60 秒內全站都會用新值、不用重新部署網站。
            </Hint>
          </span>
          、不用 Zeabur redeploy。
          <br />
          <span className="text-yellow-400 text-xs">
            ⚠️ 系統 <span className="inline-flex items-center">secret<Hint title="Secret（機密）">不能讓公眾看到的設定值、例如資料庫密碼、API 金鑰。這類值必須存在 Zeabur env、不放這頁。</Hint></span>
            （SUPABASE_*, AI_KEY_SECRET, AI Provider keys）仍須走{" "}
            <a href="/admin/env" className="underline">/admin/env</a>（Zeabur env）、不放這。
          </span>
        </p>
      </header>

      <AppSettingsClient initial={(data as any) ?? []} />
    </div>
  );
}
