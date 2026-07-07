import { CAREER_PATHS } from "@/lib/types";
import { SITE_STATS } from "@/lib/site-stats";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";

export async function CareerPathSection() {
  const t = await getTranslations("home");
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-bold mb-2 inline-flex w-full items-center justify-center gap-2 reveal"><Target size={28} /> {t("careerHeading")}</h2>
      <p className="text-center text-fg-muted mb-10 reveal">{t("careerSubtitle", { n: SITE_STATS.chapterCount })}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(CAREER_PATHS).map((path, idx) => (
          <Link
            key={path.id}
            href={`/career/${path.id}`}
            className={`group p-5 surface hover-lift reveal ${idx < 3 ? `reveal-d${idx + 1}` : ""}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{path.emoji}</div>
              <div className="text-xs px-2 py-1 rounded bg-bg text-fg-muted">
                {t("chaptersCount", { n: path.chapters.length })}
              </div>
            </div>
            <h3 className="font-bold text-lg mb-1">{path.name}</h3>
            <div className="text-sm text-accent mb-2 inline-flex items-center gap-1.5"><ArrowRight size={14} /> {path.title}</div>
            <p className="text-xs text-fg-muted leading-relaxed">{path.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
