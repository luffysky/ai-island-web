import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { CompetitorClient } from "./CompetitorClient";

export const dynamic = "force-dynamic";

export default async function CompetitorPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("competitor_snapshots")
    .select("*")
    .order("snapshot_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🔍"
        title="競品 / 關鍵字"
        desc="紀錄主要競品的價格 / 功能 / 威脅程度。每 2 個月跑一次 snapshot、看價格 / 新功能。"
        gradient="from-orange-500/10 via-amber-500/10 to-yellow-500/10"
        borderColor="border-orange-500/30"
      />

      <CompetitorClient initial={(data as any[]) ?? []} />
    </div>
  );
}
