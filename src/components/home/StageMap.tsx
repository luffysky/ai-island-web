import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { STAGE_COLORS } from "@/lib/utils";
import { BookOpen, Sparkles, Map } from "lucide-react";
import { Reveal } from "./parallax";
import { WorldMap, type MapNode } from "./world";

/** 關卡定義（節點座標 % 對齊 stage-path 底圖的 6 個發光路點；章數改由真實資料算、不寫死）*/
const STAGES: Array<{ stage: number; iconKey: MapNode["iconKey"]; x: number; y: number }> = [
  { stage: 1, iconKey: "landmark", x: 14, y: 79 },
  { stage: 2, iconKey: "castle", x: 29, y: 64 },
  { stage: 3, iconKey: "settings", x: 40, y: 50 },
  { stage: 4, iconKey: "globe", x: 58, y: 50 },
  { stage: 5, iconKey: "briefcase", x: 64, y: 34 },
  { stage: 6, iconKey: "bot", x: 87, y: 18 },
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

export async function StageMap({ chapters = [] }: { chapters?: Array<{ stage: number | string }> }) {
  const t = await getTranslations("home");

  // 每個 stage 的章數 = 從真實章節資料算（不寫死；DB 現有 80 章）
  const countByStage: Record<string, number> = {};
  for (const c of chapters) {
    const k = String(c.stage);
    countByStage[k] = (countByStage[k] ?? 0) + 1;
  }
  const countFor = (stage: number) => countByStage[String(stage)] ?? 0;
  const totalChapters = chapters.length;
  const mainTotal = STAGES.reduce((sum, s) => sum + countFor(s.stage), 0);
  const refTotal = Math.max(0, totalChapters - mainTotal);

  const nodes: MapNode[] = STAGES.map((s) => ({
    id: s.stage,
    name: STAGE_COLORS[s.stage].name,
    sub: t(`stage${s.stage}Subtitle`),
    chapters: `${countFor(s.stage)} 章`,
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
          <h2 className="text-3xl font-bold mb-2 inline-flex items-center gap-2 text-fg">
            <Map size={28} className="text-accent" /> {t("stageMapHeading")}
          </h2>
          <p className="text-fg-muted">{t("stageMapSubtitle")}</p>
        </Reveal>

        {/* 互動關卡地圖：底圖＝GPT 的 stage-path 發光路徑層(alpha)，節點＝資料驅動疊在路點上、可點進該關 */}
        <Reveal delay={0.05} className="mb-12">
          <WorldMap nodes={nodes} image="/home/stage-path.png" aspect="aspect-[3/2]" imageObjectFit="contain" className="max-w-4xl mx-auto" />
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
                    <BookOpen size={14} /> {countFor(item.stage)} 章
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-8 text-sm text-fg-muted inline-flex w-full items-center justify-center gap-1.5">
          <Sparkles size={14} /> {t("stageMapFooter")} <Sparkles size={14} />
        </div>
        {totalChapters > 0 && (
          <div className="mt-2 text-center text-xs text-fg-dim">
            六大關卡共 {mainTotal} 章{refTotal > 0 ? ` · 另有速查附錄 ${refTotal} 章` : ""} · 全站 {totalChapters} 章
          </div>
        )}
      </div>
    </section>
  );
}
