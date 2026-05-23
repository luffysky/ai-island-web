import Image from "next/image";

const TRAP_BOSSES = [
  {
    no: 1,
    name: "模糊提問獸",
    symptom: "問題太模糊、AI 也不知道你要什麼、答案當然不準！",
    weakness: "明確目標",
    solve: "讓 AI 清楚背景、需求、條件與期望的輸出格式！",
    color: "border-red-500/30 bg-red-500/5",
  },
  {
    no: 2,
    name: "Prompt 咒術師",
    symptom: "迷信複製貼上別人的 Prompt、不懂原理就亂用！",
    weakness: "理解原理",
    solve: "先理解結構與邏輯、再依需求調整！",
    color: "border-purple-500/30 bg-purple-500/5",
  },
  {
    no: 3,
    name: "單次許願鬼",
    symptom: "一次想要太多、內容太複雜、AI 無法一次給你完美結果！",
    weakness: "分步驟",
    solve: "拆解問題、一步一步來、逐步優化！",
    color: "border-violet-500/30 bg-violet-500/5",
  },
  {
    no: 4,
    name: "照單全收魔",
    symptom: "不加思考全部相信、容易被錯誤資訊誤導！",
    weakness: "批判思考",
    solve: "驗證來源、交叉比對、保持懷疑與判斷力！",
    color: "border-cyan-500/30 bg-cyan-500/5",
  },
  {
    no: 5,
    name: "複製貼上蟲",
    symptom: "不理解內容就直接複製、導致學不到東西！",
    weakness: "內化吸收",
    solve: "理解內容後再輸出、變成自己的知識！",
    color: "border-green-500/30 bg-green-500/5",
  },
];

export function TrapBosses() {
  return (
    <section className="border-b border-border py-16 bg-gradient-to-b from-transparent via-bg-elevated/10 to-transparent">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-full text-xs bg-red-500/10 border border-red-500/30 text-red-400 mb-3">
            ⚠️ 90% 的新手都會中招
          </div>
          <h2 className="text-3xl font-bold mb-2">👹 新手最容易踩的 5 大坑</h2>
          <p className="text-fg-muted">五大陷阱魔王、打敗它們才能真正升級！</p>
        </div>

        <div className="mb-12">
          <Image
            src="/mascot/boss-pits.png"
            alt="新手最容易踩的 5 大坑"
            width={1200}
            height={700}
            sizes="(max-width: 768px) 100vw, 896px"
            className="w-full max-w-4xl mx-auto h-auto rounded-2xl shadow-xl border border-border"
          />
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {TRAP_BOSSES.map((b) => (
            <div key={b.no} className={`rounded-xl border ${b.color} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-xs font-bold">
                  {b.no}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                  BOSS
                </span>
              </div>
              <h3 className="font-bold mb-2">{b.name}</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-red-400/80 font-semibold mb-0.5">症狀</div>
                  <p className="text-fg-muted leading-relaxed">{b.symptom}</p>
                </div>
                <div>
                  <div className="text-yellow-400/80 font-semibold mb-0.5">弱點</div>
                  <p>{b.weakness}</p>
                </div>
                <div>
                  <div className="text-green-400/80 font-semibold mb-0.5">破解方式</div>
                  <p className="text-fg-muted leading-relaxed">{b.solve}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
