import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Sparkles, FileText } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getOrCreatePersonalWorkspace, getWorkspaceById, getWorkspaceRole } from "@/lib/creator-engine/workspace";
import { listDrafts } from "@/lib/creator-engine/drafts";
import { listSeries } from "@/lib/creator-engine/series";
import { CreatePicker } from "./CreatePicker";

export const dynamic = "force-dynamic";

export default async function CreateEnginePage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const t = await getTranslations("creator");
  if (!(await isCreatorIslandEnabled())) {
    return <FeatureOffNotice title={`🎨 ${t("createFeatureOffTitle")}`} desc={t("createFeatureOffDesc")} />;
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
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-300 via-pink-400 to-violet-400 bg-clip-text text-transparent inline-flex items-center gap-2"><Sparkles className="text-pink-400" size={28} /> {t("createEngineTitle")}</h1>
          <p className="text-sm text-fg-muted mt-1">{t("createEngineSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/me/blog" className="text-sm px-3 py-1.5 rounded-full bg-bg-card border border-border hover:border-accent hover:text-accent transition inline-flex items-center gap-1.5"><FileText size={14} /> {t("createMyBlog")}</Link>
          <Link href="/creator-island" className="text-sm px-3 py-1.5 rounded-full bg-bg-card border border-border hover:border-accent hover:text-accent transition">← {t("createBackToIsland")}</Link>
        </div>
      </div>
      <CreatePicker workspaceId={active.id} drafts={drafts as any} series={series as any} />
    </div>
  );
}
