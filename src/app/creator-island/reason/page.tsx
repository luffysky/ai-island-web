import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";
import { listAllFragments } from "@/lib/creator-engine/fragments";
import { ReasonClient } from "./ReasonClient";

export const dynamic = "force-dynamic";

export default async function ReasonPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/reason");
  const ws = await getActiveWorkspace(user.id);
  const fragments = await listAllFragments(ws.id); // 全部碎片（分頁撈滿，避免只給前 60 個）
  return <ReasonClient workspaceId={ws.id} fragments={fragments.map((f) => ({ id: f.id, title: f.title }))} />;
}
