import { redirect, notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getWork, workWorkspace, workFragmentIds } from "@/lib/creator-engine/works";
import { getFragmentsByIds } from "@/lib/creator-engine/fragments";
import { getLineage } from "@/lib/creator-engine/lineage";
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

  // E3 lineage：composition（用到的碎片）+ 衍生邊
  const fragIds = await workFragmentIds(id);
  const usedFragments = fragIds.length ? (await getFragmentsByIds(ws, fragIds)).map((f) => ({ id: f.id, title: f.title })) : [];
  const lineage = await getLineage(id);

  return (
    <WorkEditor
      work={work as any}
      canEdit={roleAtLeast(role, "contributor")}
      usedFragments={usedFragments}
      derivedCount={lineage.incoming.length}
    />
  );
}
