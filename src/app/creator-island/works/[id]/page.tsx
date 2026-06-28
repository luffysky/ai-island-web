import { redirect, notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getWork, workWorkspace } from "@/lib/creator-engine/works";
import { getWorkspaceRole, roleAtLeast } from "@/lib/creator-engine/workspace";
import { WorkEditor } from "./WorkEditor";

export const dynamic = "force-dynamic";

export default async function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const { id } = await params;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=/creator-island/works/${id}`);

  const ws = await workWorkspace(id);
  if (!ws) notFound();
  const role = await getWorkspaceRole(ws, user.id);
  if (!roleAtLeast(role, "viewer")) notFound();
  const work = await getWork(id);
  if (!work) notFound();

  return <WorkEditor work={work as any} canEdit={roleAtLeast(role, "contributor")} />;
}
