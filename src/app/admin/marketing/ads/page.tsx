import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { AdsClient } from "./AdsClient";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ad_creatives")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🎯"
        title="廣告 Copy 產生"
        desc="AI 為 Meta / Google / TikTok / LINE Ads 生 A/B 版廣告文案 (Headline / Primary / Description / CTA)、含字數檢查、套 brand voice。投放出去後手動回填 performance 數據。"
        gradient="from-red-500/10 via-pink-500/10 to-fuchsia-500/10"
        borderColor="border-red-500/30"
      />

      <AdsClient initial={(data as any[]) ?? []} />
    </div>
  );
}
