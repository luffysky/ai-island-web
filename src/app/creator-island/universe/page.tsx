import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getUniverse } from "@/lib/creator-engine/fie/universe";
import { UniverseClient } from "./UniverseClient";

export const dynamic = "force-dynamic";

export default async function UniversePage() {
  const t = await getTranslations("creator");
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title={`🎨 ${t("comingSoonFeatureOff")}`} />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/universe");
  const { stats, report, generatedAt } = await getUniverse(user.id);
  return <UniverseClient stats={stats} initialReport={report} generatedAt={generatedAt} />;
}
