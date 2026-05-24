import Link from "next/link";
import Image from "next/image";

type HeroProps = {
  totalChapters: number;
  totalLessons: number;
  stageCount: number;
  islandEnabled?: boolean;
};

export function Hero({ totalChapters, totalLessons, stageCount, islandEnabled = true }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* 背景模糊光暈 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-3/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 relative">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* 左側：文案 */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-bg-card border border-border mb-6">
              <span>🏝️</span>
              <span>2026 全新改版 · 跟 肥仔・菇寶・綠寶 一起冒險</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
              用最簡單的方式
              <br />
              學會<span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">最難</span>的<span className="bg-gradient-to-r from-accent-2 to-accent-3 bg-clip-text text-transparent">技術</span>
            </h1>
            <p className="text-lg text-fg-muted mb-3 leading-relaxed">
              {totalChapters} 章 × {totalLessons}+ lesson · HTML 到 AI Agent 全端養成
              <br />
              像玩 RPG 一樣升級、打 boss、組隊、成為 AI 高玩
            </p>
            <p className="text-sm text-fg-muted mb-7 leading-relaxed">
              <strong className="text-fg">繁體中文程式自學平台</strong>：
              學 HTML / CSS / JavaScript / TypeScript / React / Vue / Next.js /
              Node.js / Python / AI Agent / Prompt Engineering、
              <strong className="text-fg">從零基礎到能接案 / 找全端工作</strong>。
            </p>
            {/* 雙模式入口（依 3D 島嶼 spec 附錄 B） */}
            <div className={`grid grid-cols-1 ${islandEnabled ? "sm:grid-cols-2" : ""} gap-3`}>
              {islandEnabled && (
                <Link
                  href={"/island" as any}
                  className="group relative overflow-hidden rounded-xl border-2 border-accent/40 p-5 bg-gradient-to-br from-accent/15 to-accent-2/10 hover:border-accent transition-all hover:scale-[1.02]"
                >
                  <div className="absolute -top-4 -right-4 text-5xl opacity-30 group-hover:opacity-50 transition">🏝️</div>
                  <div className="text-2xl mb-1">🏝️ 島嶼模式</div>
                  <div className="font-bold text-lg mb-1">進入 AI 島</div>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    3D 沉浸式探索、有 AI 夥伴陪你闖關。
                  </p>
                  <span className="text-[10px] text-accent mt-2 inline-block">v0 / coming soon →</span>
                </Link>
              )}
              <Link
                href="/chapters"
                className="group relative overflow-hidden rounded-xl border-2 border-border p-5 bg-bg-card hover:border-accent transition-all hover:scale-[1.02]"
              >
                <div className="absolute -top-4 -right-4 text-5xl opacity-30 group-hover:opacity-50 transition">📋</div>
                <div className="text-2xl mb-1">📋 經典模式</div>
                <div className="font-bold text-lg mb-1">快速開始學習</div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  清單式、直接看章節、高效率。
                </p>
                <span className="text-[10px] text-fg-muted mt-2 inline-block">推薦給想快速學的人 →</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 text-center md:text-left">
              <div>
                <div className="text-3xl font-bold text-accent">{totalChapters}</div>
                <div className="text-xs text-fg-muted mt-1">章節 + 附錄</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent-2">{totalLessons}+</div>
                <div className="text-xs text-fg-muted mt-1">完整 lesson</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent-3">{stageCount}</div>
                <div className="text-xs text-fg-muted mt-1">技術區域</div>
              </div>
            </div>
          </div>

          {/* 右側：英雄地圖 */}
          <div className="relative">
            <Image
              src="/mascot/hero-map.png"
              alt="AI 島 — 繁體中文程式自學平台、HTML / React / Next.js / AI Agent 71 章全端養成、跟肥仔菇寶綠寶 AI 導師冒險"
              width={1200}
              height={800}
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              className="w-full h-auto rounded-2xl shadow-2xl border border-border"
            />
            {/* 角色 label */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              <span className="px-2 py-1 rounded-full text-xs bg-bg-card border border-orange-400/40 text-orange-400">
                ⚔️ 肥仔
              </span>
              <span className="px-2 py-1 rounded-full text-xs bg-bg-card border border-purple-400/40 text-purple-400">
                📐 菇寶
              </span>
              <span className="px-2 py-1 rounded-full text-xs bg-bg-card border border-green-400/40 text-green-400">
                ✨ 綠寶
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
