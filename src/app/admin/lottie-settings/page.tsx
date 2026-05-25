import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { LottieSettingsClient } from "./LottieSettingsClient";
import { LOTTIE_SLOTS } from "./slots";
import { PageHero } from "@/components/admin/PageHero";

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
      <PageHero
        emoji="🎨"
        title="Lottie 動畫設定"
        desc="幫每個用途 paste 一個 LottieFiles .lottie URL、右側即時 preview、按「儲存」就上線、不用改 code。推薦關鍵字在每個欄位下方。"
        gradient="from-pink-500/10 via-purple-500/10 to-violet-500/10"
        borderColor="border-pink-500/30"
      />
      <LottieSettingsClient slots={LOTTIE_SLOTS} initial={settings} />
    </div>
  );
}
