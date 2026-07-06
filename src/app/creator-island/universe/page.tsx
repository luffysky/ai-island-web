import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getUniverse } from "@/lib/creator-engine/fie/universe";
import { UniverseClient } from "./UniverseClient";

export const dynamic = "force-dynamic";

export default async function UniversePage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/universe");
  const { stats, report, generatedAt } = await getUniverse(user.id);
  return <UniverseClient stats={stats} initialReport={report} generatedAt={generatedAt} />;
}
