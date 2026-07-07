import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Palette, ArrowLeft, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { listShowcasedWorks } from "@/lib/creator-engine/works";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "公開展示 · 創作者島嶼 | AI 島",
  description: "AI 島創作者精選作品公開展示。",
};

function excerpt(html: string, n = 120): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
}

export default async function ShowcasePage() {
  const t = await getTranslations("creator");
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title={`🎨 ${t("comingSoonFeatureOff")}`} />;
  const works = await listShowcasedWorks(60);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Palette size={22} className="text-accent" /> {t("showcaseTitle")}
          <span className="text-xs font-normal text-fg-muted">{t("showcaseSubtitle")}</span>
        </h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> {t("showcaseBackToIsland")}</Link>
      </header>

      {works.length === 0 ? (
        <div className="surface p-10 text-center text-fg-muted">
          <div className="text-4xl mb-3">🎨</div>
          <p className="text-sm">{t("showcaseEmpty")}</p>
          <p className="text-xs mt-1">{t("showcaseEmptyHint")}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {works.map((w) => (
            <Link key={w.id} href={`/creator-island/works/${w.id}`} className="surface hover-lift p-5 block group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">{w.work_type}</span>
                {w.showcased_at && <span className="text-[10px] text-fg-muted">{new Date(w.showcased_at).toLocaleDateString("zh-TW")}</span>}
              </div>
              <h2 className="font-bold text-lg group-hover:text-accent transition line-clamp-1">{w.title || t("showcaseUntitled")}</h2>
              <p className="text-sm text-fg-muted line-clamp-3 mt-1 leading-relaxed">{excerpt(w.body)}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-fg-muted">
                {w.author_avatar ? (
                  <Image src={w.author_avatar} alt="" width={20} height={20} unoptimized className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-accent/15 grid place-items-center text-accent"><Sparkles size={11} /></span>
                )}
                {w.author_name ?? t("showcaseAuthorFallback")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
