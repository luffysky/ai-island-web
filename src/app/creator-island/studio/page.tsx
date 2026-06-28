import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { listWorkspaces } from "@/lib/creator-engine/workspace";
import { StudioClient } from "./StudioClient";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/studio");
  const workspaces = await listWorkspaces(user.id);
  return <StudioClient initialWorkspaces={workspaces as any} />;
}
