import { redirect, notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getWorkspaceRole } from "@/lib/creator-engine/workspace";
import { getDraft } from "@/lib/creator-engine/drafts";
import { listFragments } from "@/lib/creator-engine/fragments";
import { EngineWorkspace } from "./EngineWorkspace";

export const dynamic = "force-dynamic";

export default async function DraftEditorPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isCreatorIslandEnabled())) {
    return <FeatureOffNotice title="🎨 創作者島嶼即將開放" desc="這座島還在建造中，敬請期待。" />;
  }
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=/creator-island/create/${id}`);

  const draft = await getDraft(id);
  if (!draft) notFound();
  const role = await getWorkspaceRole(draft.workspace_id, user.id);
  if (!role) notFound();

  const { items: fragments } = await listFragments(draft.workspace_id, { limit: 100 });

  return <EngineWorkspace draft={draft as any} fragments={fragments as any} />;
}
