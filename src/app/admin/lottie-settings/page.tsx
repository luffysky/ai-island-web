import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { LottieSettingsClient } from "./LottieSettingsClient";
import { LOTTIE_SLOTS } from "./slots";

export const dynamic = "force-dynamic";

export default async function LottieSettingsPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", LOTTIE_SLOTS.map((s) => s.key).concat(["admin_lottie_opacity", "home_hero_lottie_opacity"]));

  const settings: Record<string, any> = {};
  for (const r of (data as any[]) ?? []) {
    settings[r.key] = r.value;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">🎨 Lottie 動畫設定</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          幫每個用途 paste 一個 LottieFiles 的 <code className="text-purple-300 bg-bg-elevated px-1 rounded">.lottie</code> URL、
          右側即時 preview、滿意按「儲存」就上線、不用動 code。
          推薦關鍵字在每個欄位下方、點關鍵字直接去 LottieFiles 搜尋。
        </p>
      </div>
      <LottieSettingsClient slots={LOTTIE_SLOTS} initial={settings} />
    </div>
  );
}
