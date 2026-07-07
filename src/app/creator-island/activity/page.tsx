import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ScrollText, ArrowLeft, Sparkles, Sprout, Wand2, PenTool, Palmtree } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getActivity } from "@/lib/creator-engine/activity";
import { listWorkspaces } from "@/lib/creator-engine/workspace";

export const dynamic = "force-dynamic";

const KIND_ICON = { ai: Sparkles, fragment: Sprout, work: Wand2, draft: PenTool } as const;
const KIND_COLOR = {
  ai: "text-violet-700 dark:text-violet-300 bg-violet-500/10",
  fragment: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
  work: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
  draft: "text-sky-700 dark:text-sky-300 bg-sky-500/10",
} as const;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const t = await getTranslations("creator");
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title={`🎨 ${t("comingSoonFeatureOff")}`} />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/activity");

  const { ws } = await searchParams;
  const workspaces = await listWorkspaces(user.id);
  const personal = workspaces.find((w) => w.type === "personal") ?? workspaces[0];
  const scope = ws ?? personal?.id ?? "all";
  const wsId = scope === "all" ? null : scope;
  const items = await getActivity(user.id, wsId, 80);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-5">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><ScrollText size={22} /> {t("activityTitle")}</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> {t("activityBackToIsland")}</Link>
      </header>

      {workspaces.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-fg-muted mr-0.5">{t("activityScope")}</span>
          {workspaces.map((w) => (
            <Link key={w.id} href={`/creator-island/activity?ws=${w.id}`}
              className={`px-2.5 py-1 rounded-full border transition inline-flex items-center gap-1 ${scope === w.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
              {w.type === "personal" ? <><Palmtree size={12} /> {t("activityPersonalIsland")}</> : w.name}
            </Link>
          ))}
          <Link href="/creator-island/activity?ws=all"
            className={`px-2.5 py-1 rounded-full border transition ${scope === "all" ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
            {t("activityAll")}
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-sm text-fg-muted text-center py-12">{t("activityEmpty")}</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => {
            const Icon = KIND_ICON[it.kind];
            return (
              <li key={i} className="flex items-center gap-3 bg-bg-card border border-border rounded-xl px-3 py-2.5">
                <span className={`shrink-0 grid place-items-center w-8 h-8 rounded-full ${KIND_COLOR[it.kind]}`}><Icon size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{it.label}</span>
                    {it.title && <span className="text-fg-muted"> · {it.title}</span>}
                    {it.status === "failed" && <span className="text-red-500"> · {t("activityFailed")}</span>}
                  </div>
                </div>
                <time className="shrink-0 text-[11px] text-fg-muted">{new Date(it.at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-fg-muted">{t("activityFootnote")}</p>
    </div>
  );
}
