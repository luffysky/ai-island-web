import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getOrCreatePersonalWorkspace, getWorkspaceById, getWorkspaceRole } from "@/lib/creator-engine/workspace";
import { listDrafts } from "@/lib/creator-engine/drafts";
import { listSeries } from "@/lib/creator-engine/series";
import { CreatePicker } from "./CreatePicker";

export const dynamic = "force-dynamic";

export default async function CreateEnginePage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  if (!(await isCreatorIslandEnabled())) {
    return <FeatureOffNotice title="🎨 創作者島嶼即將開放" desc="這座島還在建造中，敬請期待。" />;
  }
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/create");

  const personal = await getOrCreatePersonalWorkspace(user.id);
  const { ws: wsParam } = await searchParams;
  let active = personal;
  if (wsParam && wsParam !== personal.id) {
    const role = await getWorkspaceRole(wsParam, user.id);
    const target = role ? await getWorkspaceById(wsParam) : null;
    if (target) active = target;
  }
  const [drafts, series] = await Promise.all([
    listDrafts(active.id, { limit: 50 }),
    listSeries(active.id),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-300 via-pink-400 to-violet-400 bg-clip-text text-transparent">✨ 創作引擎</h1>
          <p className="text-sm text-fg-muted mt-1">選一種要創作的東西，直接開寫。每種類型都帶齊它該有的工具。</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/me/blog" className="text-sm px-3 py-1.5 rounded-full bg-bg-card border border-border hover:border-accent hover:text-accent transition">📝 我的部落格</Link>
          <Link href="/creator-island" className="text-sm px-3 py-1.5 rounded-full bg-bg-card border border-border hover:border-accent hover:text-accent transition">← 回島嶼</Link>
        </div>
      </div>
      <CreatePicker workspaceId={active.id} drafts={drafts as any} series={series as any} />
    </div>
  );
}
