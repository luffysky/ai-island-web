import Link from "next/link";

const LEVELS = [
  { lv: 1, stage: 1, name: "小白村", emoji: "🏛️", subtitle: "AI 新手啟程", desc: "認識 AI 是什麼、學會問問題與對話、體驗 AI 的魔法", color: "from-green-400 to-cyan-400", chapters: "Ch01-08" },
  { lv: 2, stage: 2, name: "工具冒險者", emoji: "🏰", subtitle: "掌握趁手裝備", desc: "學會選擇與使用工具、提升效率與產出、打造你的專屬工作流", color: "from-cyan-400 to-purple-400", chapters: "Ch09-15" },
  { lv: 3, stage: 3, name: "AI 協作者", emoji: "⚙️", subtitle: "與 AI 並肩作戰", desc: "進階提示詞技巧、讓 AI 更懂你的需求、合作完成複雜任務", color: "from-purple-400 to-pink-400", chapters: "Ch16-25" },
  { lv: 4, stage: 4, name: "AI 指揮官", emoji: "🌍", subtitle: "策略整合 × 團隊力", desc: "整合多工具與流程、規劃專案與自動化、帶領 AI 幫你完成大事", color: "from-pink-400 to-orange-400", chapters: "Ch26-38" },
  { lv: 5, stage: 5, name: "AI 系統架構師", emoji: "💼", subtitle: "打造專屬系統", desc: "設計個人知識系統、建立 SOP 與自動化、讓 AI 成為你的系統", color: "from-orange-400 to-yellow-400", chapters: "Ch39-50" },
  { lv: 6, stage: 6, name: "AI 高玩", emoji: "🤖", subtitle: "掌控未來 · 創造價值", desc: "高階策略與創新應用、打造個人影響力與品牌、創造更多可能與價值", color: "from-yellow-400 to-green-400", chapters: "Ch51-60" },
];

export function StageMap() {
  return (
    <section className="border-b border-[var(--color-border)] py-16 bg-gradient-to-b from-transparent to-[var(--color-bg-elevated)]/20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">🗺️ AI 島玩家升級地圖</h2>
          <p className="text-[var(--color-fg-muted)]">從新手村到 AI 高玩、你的冒險之旅由此展開</p>
        </div>

        {/* 地圖總覽圖 */}
        <div className="mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/upgrade-map.png"
            alt="AI 島玩家升級地圖：6 大關卡"
            className="w-full max-w-4xl mx-auto rounded-2xl shadow-xl border border-[var(--color-border)]"
            loading="lazy"
          />
        </div>

        {/* 6 大 level */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEVELS.map((lv) => (
            <Link
              key={lv.lv}
              href={`/chapters#stage-${lv.stage}`}
              className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 hover:border-[var(--color-accent)] transition-all hover:scale-[1.02]"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${lv.color}`}
              />
              <div className="flex items-start gap-3 mb-3">
                <div className={`text-3xl bg-gradient-to-br ${lv.color} bg-clip-text`}>
                  {lv.emoji}
                </div>
                <div>
                  <div className="text-xs font-mono text-[var(--color-fg-muted)]">LEVEL {lv.lv}</div>
                  <h3 className="text-lg font-bold">{lv.name}</h3>
                </div>
              </div>
              <div className="text-sm font-medium mb-2">{lv.subtitle}</div>
              <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed mb-3">
                {lv.desc}
              </p>
              <div className="text-xs font-mono text-[var(--color-accent)]">
                📚 {lv.chapters}
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 text-sm text-[var(--color-fg-muted)]">
          ✨ 學習 × 實戰 × 創造 × 成長 ✨
        </div>
      </div>
    </section>
  );
}
