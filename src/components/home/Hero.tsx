import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--color-border)]">
      {/* 背景模糊光暈 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[var(--color-accent)]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[var(--color-accent-3)]/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 relative">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* 左側：文案 */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-[var(--color-bg-card)] border border-[var(--color-border)] mb-6">
              <span>🏝️</span>
              <span>2026 全新改版 · 跟 肥仔・菇寶・綠寶 一起冒險</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
              用最簡單的方式
              <br />
              學會<span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-transparent">最難</span>的<span className="bg-gradient-to-r from-[var(--color-accent-2)] to-[var(--color-accent-3)] bg-clip-text text-transparent">技術</span>
            </h1>
            <p className="text-lg text-[var(--color-fg-muted)] mb-7 leading-relaxed">
              67 章 × 1097+ lesson · HTML 到 AI Agent 全端養成
              <br />
              像玩 RPG 一樣升級、打 boss、組隊、成為 AI 高玩
            </p>
            <div className="flex gap-3 justify-center md:justify-start flex-wrap">
              <Link
                href="/signup"
                className="px-6 py-3 bg-[var(--color-accent)] text-black rounded-lg font-bold hover:scale-105 transition-transform"
              >
                🚀 開始冒險
              </Link>
              <Link
                href="/chapters"
                className="px-6 py-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent)]"
              >
                📚 探索地圖
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-10 text-center md:text-left">
              <div>
                <div className="text-3xl font-bold text-[var(--color-accent)]">67</div>
                <div className="text-xs text-[var(--color-fg-muted)] mt-1">章節 + 附錄</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[var(--color-accent-2)]">1097+</div>
                <div className="text-xs text-[var(--color-fg-muted)] mt-1">完整 lesson</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[var(--color-accent-3)]">6</div>
                <div className="text-xs text-[var(--color-fg-muted)] mt-1">關卡 / Lv.1~6</div>
              </div>
            </div>
          </div>

          {/* 右側：英雄地圖 */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/hero-map.png"
              alt="AI 島高玩養成地圖：跟肥仔、菇寶、綠寶一起踏上 AI 冒險"
              className="w-full h-auto rounded-2xl shadow-2xl border border-[var(--color-border)]"
              loading="eager"
            />
            {/* 角色 label */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              <span className="px-2 py-1 rounded-full text-xs bg-[var(--color-bg-card)] border border-orange-400/40 text-orange-400">
                ⚔️ 肥仔
              </span>
              <span className="px-2 py-1 rounded-full text-xs bg-[var(--color-bg-card)] border border-purple-400/40 text-purple-400">
                📐 菇寶
              </span>
              <span className="px-2 py-1 rounded-full text-xs bg-[var(--color-bg-card)] border border-green-400/40 text-green-400">
                ✨ 綠寶
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
