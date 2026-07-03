import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero, AdminStatCard } from "@/components/admin/PageHero";
import { FlagsManager } from "./FlagsManager";
import { Flag, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * 功能開關 (Feature Flags) 視覺化面板
 *
 * 慣例：app_settings 內 `category = 'feature'` 的 row 即為功能開關。
 *   - value 為 boolean → 純 on/off
 *   - value 為 { enabled: boolean, rollout: number } → 帶灰度百分比
 * 兩種都相容既有 lib/app-settings.ts 的 truthyFlag() 讀法（看 enabled / boolean）。
 *
 * 讀：即時撈 category='feature'（data-driven、不寫死清單）。
 * 寫：沿用既有 app-settings API — 切換走 POST /api/admin/settings、
 *     新增走 POST /api/admin/app-settings（category=feature）。兩者都有 audit log。
 */
export default async function FlagsPage() {
  const supabase = createSupabaseAdmin();

  const { data: flags, error } = await supabase
    .from("app_settings")
    .select("key, value, description, value_type, category, updated_at")
    .eq("category", "feature")
    .order("key");

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2 inline-flex items-center gap-1">
          <AlertTriangle size={16} className="text-yellow-500" /> 需要先跑 admin migration
        </div>
        <code className="block bg-bg p-3 rounded text-xs">supabase/admin_migration.sql</code>
      </div>
    );
  }

  const rows = flags ?? [];
  const isOn = (v: any) =>
    typeof v === "boolean"
      ? v
      : typeof v === "string"
        ? v === "true"
        : !!(v && typeof v === "object" && v.enabled);
  const onCount = rows.filter((r) => isOn(r.value)).length;
  const partial = rows.filter(
    (r) => r.value && typeof r.value === "object" && typeof r.value.rollout === "number" && r.value.rollout < 100,
  ).length;

  return (
    <div className="space-y-4">
      <PageHero
        icon={Flag}
        title="功能開關 (Feature Flags)"
        desc="視覺化管理 app_settings 內 category='feature' 的開關。切換即時生效、寫 audit log。灰度 % 需搭配程式讀取才會作用。"
        gradient="from-emerald-500/10 via-teal-500/10 to-cyan-500/10"
        borderColor="border-emerald-500/30"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <AdminStatCard label="開關總數" value={rows.length} hint="category = 'feature'" />
        <AdminStatCard label="開啟中" value={onCount} color="text-emerald-400" hint={`${rows.length - onCount} 個關閉`} />
        <AdminStatCard label="灰度上線中" value={partial} color="text-amber-400" hint="rollout < 100%" />
      </div>

      <FlagsManager initial={rows as any} />
    </div>
  );
}
