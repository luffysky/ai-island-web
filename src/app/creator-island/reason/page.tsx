import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";
import { listFragments } from "@/lib/creator-engine/fragments";
import { ReasonClient } from "./ReasonClient";

export const dynamic = "force-dynamic";

export default async function ReasonPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/reason");
  const ws = await getActiveWorkspace(user.id);
  const { items: fragments } = await listFragments(ws.id, { limit: 60 });
  return <ReasonClient workspaceId={ws.id} fragments={fragments.map((f) => ({ id: f.id, title: f.title }))} />;
}
