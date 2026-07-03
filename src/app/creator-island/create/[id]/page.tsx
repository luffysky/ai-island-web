import { redirect, notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getWorkspaceRole } from "@/lib/creator-engine/workspace";
import { getDraft } from "@/lib/creator-engine/drafts";
import { listAllFragments } from "@/lib/creator-engine/fragments";
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

  // 全部碎片（跟島上碎片庫同一來源、不再只截 100 個 → 素材欄跟碎片庫同步）
  const fragments = await listAllFragments(draft.workspace_id);

  // 即時共編需要「我是誰」（游標名字 / presence）。伺服端已確認是成員，這裡只帶顯示名。
  const { data: profile } = await sb.from("profiles").select("username, display_name").eq("id", user.id).maybeSingle();
  const currentUser = {
    id: user.id,
    name: (profile as any)?.display_name || (profile as any)?.username || "訪客",
  };

  return <EngineWorkspace draft={draft as any} fragments={fragments as any} currentUser={currentUser} />;
}
