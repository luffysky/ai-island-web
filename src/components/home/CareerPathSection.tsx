import { CAREER_PATHS } from "@/lib/types";
import { SITE_STATS } from "@/lib/site-stats";
import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";

export function CareerPathSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-bold mb-2 inline-flex w-full items-center justify-center gap-2"><Target size={28} /> 選一條職業路線</h2>
      <p className="text-center text-fg-muted mb-10">不用全 {SITE_STATS.chapterCount} 章—鎖定目標、走最短路徑、最快上場</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(CAREER_PATHS).map((path) => (
          <Link
            key={path.id}
            href={`/career/${path.id}`}
            className="group p-5 rounded-xl bg-bg-card border border-border hover:border-accent transition-all hover:scale-[1.02]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{path.emoji}</div>
              <div className="text-xs px-2 py-1 rounded bg-bg text-fg-muted">
                {path.chapters.length} 章
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
