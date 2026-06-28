import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getStats, getDNA } from "@/lib/creator-engine/growth";
import { GrowthClient } from "./GrowthClient";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/growth");
  const [stats, dna] = await Promise.all([getStats(user.id), getDNA(user.id)]);
  return <GrowthClient stats={stats} initialDna={dna} />;
}
