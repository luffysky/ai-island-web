import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { STAGE_COLORS } from "@/lib/utils";
import { BookOpen, Sparkles, Map, Landmark, Castle, Settings, Globe, Briefcase, Bot, type LucideIcon } from "lucide-react";

const STAGE_ICONS: Record<number, LucideIcon> = {
  1: Landmark,
  2: Castle,
  3: Settings,
  4: Globe,
  5: Briefcase,
  6: Bot,
};

const STAGES = [
  { stage: 1, color: "from-green-400 to-cyan-400", chapters: "Ch01-08" },
  { stage: 2, color: "from-cyan-400 to-purple-400", chapters: "Ch09-15" },
  { stage: 3, color: "from-purple-400 to-pink-400", chapters: "Ch16-25" },
  { stage: 4, color: "from-pink-400 to-orange-400", chapters: "Ch26-38" },
  { stage: 5, color: "from-orange-400 to-yellow-400", chapters: "Ch39-50" },
  { stage: 6, color: "from-yellow-400 to-green-400", chapters: "Ch51-60" },
];

export async function StageMap() {
  const t = await getTranslations("home");
  return (
    <section className="border-b border-border py-16 bg-gradient-to-b from-transparent to-bg-elevated/20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10 reveal">
          <h2 className="text-3xl font-bold mb-2 inline-flex items-center gap-2"><Map size={28} className="text-accent" /> {t("stageMapHeading")}</h2>
          <p className="text-fg-muted">{t("stageMapSubtitle")}</p>
        </div>

        {/* 地圖總覽圖 */}
        <div className="mb-12">
          <Image
            src="/mascot/adventure-map.png"
            alt={t("stageMapAlt")}
            width={1200}
            height={700}
            sizes="(max-width: 768px) 100vw, 896px"
            className="w-full max-w-4xl mx-auto h-auto rounded-2xl shadow-xl border border-border"
          />
        </div>

        {/* 6 大技術區域 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAGES.map((item, idx) => {
            const stage = STAGE_COLORS[item.stage];
            const StageIcon = STAGE_ICONS[item.stage] ?? Sparkles;
            return (
              <Link
                key={item.stage}
                href={`/chapters#stage-${item.stage}`}
                className={`group relative overflow-hidden surface hover-lift p-5 reveal ${idx < 3 ? `reveal-d${idx + 1}` : ""}`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`}
                />
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0" style={{ color: stage.from }}>
                    <StageIcon size={30} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-fg-muted">STAGE {item.stage}</div>
                    <h3 className="text-lg font-bold">{stage.name}</h3>
                  </div>
                </div>
                <div className="text-sm font-medium mb-2">{t(`stage${item.stage}Subtitle`)}</div>
                <p className="text-xs text-fg-muted leading-relaxed mb-3">
                  {t(`stage${item.stage}Desc`)}
                </p>
                <div className="text-xs font-mono text-accent inline-flex items-center gap-1">
                  <BookOpen size={14} /> {item.chapters}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-sm text-fg-muted inline-flex w-full items-center justify-center gap-1.5">
          <Sparkles size={14} /> {t("stageMapFooter")} <Sparkles size={14} />
        </div>
      </div>
    </section>
  );
}
