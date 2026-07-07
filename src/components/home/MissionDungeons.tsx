import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Swords, Skull, PenLine, Palette, Clapperboard, Settings, Code } from "lucide-react";

const DUNGEONS = [
  {
    id: "writing",
    key: "Writing",
    no: 1,
    icon: PenLine,
    tools: ["ChatGPT", "Claude", "Notion AI"],
    color: "from-green-400 to-emerald-500",
    border: "border-green-400/30 bg-green-400/5",
    href: "/courses/ai-writing",
  },
  {
    id: "design",
    key: "Design",
    no: 2,
    icon: Palette,
    tools: ["Midjourney", "DALL-E", "Leonardo"],
    color: "from-blue-400 to-cyan-500",
    border: "border-blue-400/30 bg-blue-400/5",
    href: "/courses/ai-design",
  },
  {
    id: "video",
    key: "Video",
    no: 3,
    icon: Clapperboard,
    tools: ["Pika", "Runway", "Descript"],
    color: "from-purple-400 to-pink-500",
    border: "border-purple-400/30 bg-purple-400/5",
    href: "/courses/ai-video",
  },
  {
    id: "automation",
    key: "Automation",
    no: 4,
    icon: Settings,
    tools: ["Zapier", "Make", "n8n"],
    color: "from-orange-400 to-yellow-500",
    border: "border-orange-400/30 bg-orange-400/5",
    href: "/courses/ai-automation",
  },
  {
    id: "code",
    key: "Code",
    no: 5,
    icon: Code,
    tools: ["GitHub Copilot", "Cursor", "Replit"],
    color: "from-pink-400 to-rose-500",
    border: "border-pink-400/30 bg-pink-400/5",
    href: "/courses/ai-coding",
  },
];

export async function MissionDungeons() {
  const t = await getTranslations("home");
  return (
    <section className="border-b border-border py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10 reveal">
          <h2 className="text-3xl font-bold mb-2 inline-flex items-center gap-2"><Swords size={28} className="text-accent" /> {t("dungeonsHeading")}</h2>
          <p className="text-fg-muted">{t("dungeonsSubtitle")}</p>
        </div>

        {/* 副本總覽圖 */}
        <div className="mb-12">
          <Image
            src="/mascot/mission-dungeons.png"
            alt={t("dungeonsAlt")}
            width={1200}
            height={700}
            sizes="(max-width: 768px) 100vw, 896px"
            className="w-full max-w-4xl mx-auto h-auto rounded-2xl shadow-xl border border-border"
          />
        </div>

        {/* 副本卡片 */}
        <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DUNGEONS.map((d, idx) => (
            <Link
              key={d.id}
              href={d.href as any}
              className={`group rounded-xl border ${d.border} p-5 hover-lift reveal ${idx < 3 ? `reveal-d${idx + 1}` : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br ${d.color} text-black`}
                  >
                    {d.no}
                  </div>
                  <d.icon size={24} className="text-fg" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-900 dark:text-red-200 font-bold">
                  BOSS
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">{t(`dungeon${d.key}Name`)}</h3>
              <div className="text-xs text-fg-muted mb-3">{t(`dungeon${d.key}Subtitle`)}</div>

              <div className="text-sm mb-3">
                <div className="font-semibold mb-1 inline-flex items-center gap-1.5"><Skull size={15} className="text-red-400" /> {t(`dungeon${d.key}Boss`)}</div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  {t(`dungeon${d.key}BossDesc`)}
                </p>
              </div>

              <div className="border-t border-border pt-3">
                <div className="text-[10px] text-fg-muted mb-1">{t("dungeonToolsLabel")}</div>
                <div className="flex flex-wrap gap-1">
                  {d.tools.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-bg-elevated border border-border"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 text-sm text-fg-muted">
          {t("dungeonsFooter")}
        </div>
      </div>
    </section>
  );
}
