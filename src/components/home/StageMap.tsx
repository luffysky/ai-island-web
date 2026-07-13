import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { STAGE_COLORS } from "@/lib/utils";
import { BookOpen, Sparkles, Map } from "lucide-react";
import { Reveal } from "./parallax";
import { WorldMap, type MapNode } from "./world";

/** 關卡定義（節點位置 % 與圖片解耦；狀態預留由使用者進度資料驅動）*/
const STAGES: Array<{ stage: number; chapters: string; iconKey: MapNode["iconKey"]; x: number; y: number }> = [
  { stage: 1, chapters: "Ch01-08", iconKey: "landmark", x: 16, y: 86 },
  { stage: 2, chapters: "Ch09-15", iconKey: "castle", x: 40, y: 70 },
  { stage: 3, chapters: "Ch16-25", iconKey: "settings", x: 60, y: 78 },
  { stage: 4, chapters: "Ch26-38", iconKey: "globe", x: 78, y: 56 },
  { stage: 5, chapters: "Ch39-50", iconKey: "briefcase", x: 54, y: 38 },
  { stage: 6, chapters: "Ch51-60", iconKey: "bot", x: 30, y: 20 },
];

/**
 * 之後可把 `currentStage` 換成真實使用者進度（完成到哪關）→ 自動算 done/current/locked。
 * 現在預設：第 1 關 current、其餘 unlocked（不假造鎖定限制）。
 */
function stateFor(stage: number, currentStage = 1): MapNode["state"] {
  if (stage < currentStage) return "done";
  if (stage === currentStage) return "current";
  return "unlocked";
}

export async function StageMap() {
  const t = await getTranslations("home");

  const nodes: MapNode[] = STAGES.map((s) => ({
    id: s.stage,
    name: STAGE_COLORS[s.stage].name,
    sub: t(`stage${s.stage}Subtitle`),
    chapters: s.chapters,
    href: `/chapters#stage-${s.stage}`,
    x: s.x,
    y: s.y,
    color: STAGE_COLORS[s.stage].from,
    iconKey: s.iconKey,
    state: stateFor(s.stage),
  }));

  return (
    <section className="relative py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2 inline-flex items-center gap-2 text-white">
            <Map size={28} className="text-accent" /> {t("stageMapHeading")}
          </h2>
          <p className="text-white/70">{t("stageMapSubtitle")}</p>
        </Reveal>

        {/* 互動關卡地圖：節點＝資料驅動、可點進該關；底圖可之後抽換成 GPT 生的 text-free 地圖 */}
        <Reveal delay={0.05} className="mb-12">
          <WorldMap nodes={nodes} />
        </Reveal>

        {/* 六大關卡詳情（保留文字＝SEO / 無障礙 / 手機好讀；玻璃卡一致化）*/}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAGES.map((item, idx) => {
            const stage = STAGE_COLORS[item.stage];
            return (
              <Reveal key={item.stage} delay={Math.min(idx, 5) * 0.05}>
                <Link
                  href={`/chapters#stage-${item.stage}`}
                  className="group relative overflow-hidden surface-glass hover-lift p-5 block h-full"
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${stage.from}, ${stage.to})` }} />
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl leading-none shrink-0">{stage.emoji}</div>
                    <div>
                      <div className="text-xs font-mono text-fg-muted">STAGE {item.stage}</div>
                      <h3 className="text-lg font-bold">{stage.name}</h3>
                    </div>
                  </div>
                  <div className="text-sm font-medium mb-2">{t(`stage${item.stage}Subtitle`)}</div>
                  <p className="text-xs text-fg-muted leading-relaxed mb-3">{t(`stage${item.stage}Desc`)}</p>
                  <div className="text-xs font-mono text-accent inline-flex items-center gap-1">
                    <BookOpen size={14} /> {item.chapters}
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-8 text-sm text-white/60 inline-flex w-full items-center justify-center gap-1.5">
          <Sparkles size={14} /> {t("stageMapFooter")} <Sparkles size={14} />
        </div>
      </div>
    </section>
  );
}
