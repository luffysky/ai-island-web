import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { SettingsEditor } from "./SettingsEditor";
import { PageHero } from "@/components/admin/PageHero";

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
      <PageHero
        emoji="⚙️"
        title="系統設定"
        desc="全站設定、功能開關、定價、維護模式。改完按「儲存」即時生效、所有變動都會寫 audit log。"
        gradient="from-slate-500/10 via-zinc-500/10 to-stone-500/10"
        borderColor="border-slate-500/30"
      />
      <SettingsEditor initial={settings ?? []} />
    </div>
  );
}
