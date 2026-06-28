import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";
import { listFragments } from "@/lib/creator-engine/fragments";
import { listWorks } from "@/lib/creator-engine/works";
import { listListings } from "@/lib/creator-engine/marketplace";
import { MarketClient } from "./MarketClient";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/market");
  const ws = await getActiveWorkspace(user.id);
  const [{ items: listings }, { items: frags }, { items: works }] = await Promise.all([
    listListings({ limit: 24 }),
    listFragments(ws.id, { limit: 50 }),
    listWorks(ws.id, { limit: 50 }),
  ]);
  const myAssets = [
    ...frags.map((f) => ({ id: f.id, type: "fragment" as const, title: f.title })),
    ...works.map((w) => ({ id: w.id, type: "work" as const, title: w.title })),
  ];
  return <MarketClient workspaceId={ws.id} listings={listings as any} myAssets={myAssets} />;
}
