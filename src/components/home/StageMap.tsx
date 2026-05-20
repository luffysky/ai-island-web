import Link from "next/link";
import { STAGE_COLORS } from "@/lib/utils";

const STAGES = [
  { stage: 1, subtitle: "前端入門與網頁基礎", desc: "HTML、CSS、UI/UX、JavaScript 基礎，先把網頁與互動的底子打穩。", color: "from-green-400 to-cyan-400", chapters: "Ch01-08" },
  { stage: 2, subtitle: "互動介面與現代前端", desc: "TypeScript、React、Next.js、狀態管理與前端路由，開始打造可維護的產品介面。", color: "from-cyan-400 to-purple-400", chapters: "Ch09-15" },
  { stage: 3, subtitle: "資料、API 與後端核心", desc: "資料庫、認證、API、安全與部署，把前端作品接上真正的服務能力。", color: "from-purple-400 to-pink-400", chapters: "Ch16-25" },
  { stage: 4, subtitle: "多語言與跨平台能力", desc: "Python、資料分析、爬蟲、Go、Java、PHP 等工具，擴大解題範圍。", color: "from-pink-400 to-orange-400", chapters: "Ch26-38" },
  { stage: 5, subtitle: "產品、商業與系統思維", desc: "金流、營運、專案管理、團隊協作與商業化，把技術變成可運作的產品。", color: "from-orange-400 to-yellow-400", chapters: "Ch39-50" },
  { stage: 6, subtitle: "AI 應用與高階整合", desc: "AI 工具、Agent、自動化、個人品牌與一人公司，整合前面能力做出更大成果。", color: "from-yellow-400 to-green-400", chapters: "Ch51-60" },
];

export function StageMap() {
  return (
    <section className="border-b border-[var(--color-border)] py-16 bg-gradient-to-b from-transparent to-[var(--color-bg-elevated)]/20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">🗺️ AI 島技術地圖</h2>
          <p className="text-[var(--color-fg-muted)]">從網頁基礎到 AI 整合、六大技術區域串起完整學習路線</p>
        </div>

        {/* 地圖總覽圖 */}
        <div className="mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/upgrade-map.png"
            alt="AI 島技術地圖：6 大技術區域"
            className="w-full max-w-4xl mx-auto rounded-2xl shadow-xl border border-[var(--color-border)]"
            loading="lazy"
          />
        </div>

        {/* 6 大技術區域 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAGES.map((item) => {
            const stage = STAGE_COLORS[item.stage];
            return (
              <Link
                key={item.stage}
                href={`/chapters#stage-${item.stage}`}
                className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 hover:border-[var(--color-accent)] transition-all hover:scale-[1.02]"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`}
                />
                <div className="flex items-start gap-3 mb-3">
                  <div className={`text-3xl bg-gradient-to-br ${item.color} bg-clip-text`}>
                    {stage.emoji}
                  </div>
                  <div>
                    <div className="text-xs font-mono text-[var(--color-fg-muted)]">STAGE {item.stage}</div>
                    <h3 className="text-lg font-bold">{stage.name}</h3>
                  </div>
                </div>
                <div className="text-sm font-medium mb-2">{item.subtitle}</div>
                <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed mb-3">
                  {item.desc}
                </p>
                <div className="text-xs font-mono text-[var(--color-accent)]">
                  📚 {item.chapters}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-8 text-sm text-[var(--color-fg-muted)]">
          ✨ 基礎 × 前端 × 後端 × 多語言 × 商業 × AI ✨
        </div>
      </div>
    </section>
  );
}
