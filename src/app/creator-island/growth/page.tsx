import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getStats, getDNA } from "@/lib/creator-engine/growth";
import { listWorkspaces } from "@/lib/creator-engine/workspace";
import { getEquippedCosmetics } from "@/lib/store-redeem";
import { GrowthClient } from "./GrowthClient";

export const dynamic = "force-dynamic";

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/growth");

  const { ws } = await searchParams;
  const workspaces = await listWorkspaces(user.id);
  const personal = workspaces.find((w) => w.type === "personal") ?? workspaces[0];
  // scope: "all"＝跨所有工作室加總；否則指定 workspaceId（預設個人島）
  const scope = ws ?? personal?.id ?? "all";
  const wsId = scope === "all" ? null : scope;

  const [stats, dna, equipped, { data: prof }] = await Promise.all([
    getStats(user.id, wsId), getDNA(user.id), getEquippedCosmetics(user.id),
    sb.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle(),
  ]);
  const wsList = workspaces.map((w) => ({ id: w.id, name: w.name, type: w.type }));
  const displayName = (prof as any)?.display_name || (prof as any)?.username || "創作者";
  return <GrowthClient stats={stats} initialDna={dna} workspaces={wsList} scope={scope} equipped={equipped} displayName={displayName} />;
}
