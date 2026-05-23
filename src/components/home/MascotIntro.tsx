import Image from "next/image";

export function MascotIntro() {
  return (
    <section className="border-b border-border py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">🤝 AI 島核心夥伴</h2>
          <p className="text-fg-muted">三種力量、一個目標、陪你走完冒險旅程</p>
        </div>

        <div className="relative mb-10">
          <Image
            src="/mascot/trio.png"
            alt="肥仔、菇寶、綠寶 — AI 島核心夥伴"
            width={1200}
            height={700}
            sizes="(max-width: 768px) 100vw, 896px"
            className="w-full max-w-4xl mx-auto h-auto rounded-2xl shadow-xl border border-border"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-orange-400/30 bg-orange-400/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚔️</span>
              <h3 className="text-xl font-bold text-orange-400">肥仔</h3>
            </div>
            <div className="text-sm text-fg-muted mb-2">衝鋒隊長 · 行動派先鋒</div>
            <p className="text-sm leading-relaxed">
              不囉嗦、看到 bug 就上、學習就動手寫。「做」永遠比「想」重要。
            </p>
          </div>

          <div className="p-5 rounded-xl border border-purple-400/30 bg-purple-400/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📐</span>
              <h3 className="text-xl font-bold text-purple-400">菇寶</h3>
            </div>
            <div className="text-sm text-fg-muted mb-2">策略軍師 · 冷靜分析</div>
            <p className="text-sm leading-relaxed">
              先想清楚再動手、用結構化思考拆解問題。教你「為什麼」比「怎麼做」更深。
            </p>
          </div>

          <div className="p-5 rounded-xl border border-green-400/30 bg-green-400/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">✨</span>
              <h3 className="text-xl font-bold text-green-400">綠寶</h3>
            </div>
            <div className="text-sm text-fg-muted mb-2">AI 精靈 · 創造無限</div>
            <p className="text-sm leading-relaxed">
              你的 AI 導師、隨時陪聊。問問題、討論方向、卡住找他解圍。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
