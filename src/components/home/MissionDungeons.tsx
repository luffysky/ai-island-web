import Link from "next/link";
import Image from "next/image";

const DUNGEONS = [
  {
    id: "writing",
    no: 1,
    name: "文案副本",
    emoji: "✍️",
    subtitle: "文字的力量",
    boss: "空洞文案怪",
    bossDesc: "創造吸引人、有影響力的文字內容",
    tools: ["ChatGPT", "Claude", "Notion AI"],
    color: "from-green-400 to-emerald-500",
    border: "border-green-400/30 bg-green-400/5",
    href: "/courses/ai-writing",
  },
  {
    id: "design",
    no: 2,
    name: "圖像副本",
    emoji: "🎨",
    subtitle: "視覺的魔法",
    boss: "模糊指令魔",
    bossDesc: "將想法轉化為精美且獨特的視覺作品",
    tools: ["Midjourney", "DALL-E", "Leonardo"],
    color: "from-blue-400 to-cyan-500",
    border: "border-blue-400/30 bg-blue-400/5",
    href: "/courses/ai-design",
  },
  {
    id: "video",
    no: 3,
    name: "影片副本",
    emoji: "🎬",
    subtitle: "影像的敘事",
    boss: "剪輯混亂獸",
    bossDesc: "製作吸睛影片、說好你的故事",
    tools: ["Pika", "Runway", "Descript"],
    color: "from-purple-400 to-pink-500",
    border: "border-purple-400/30 bg-purple-400/5",
    href: "/courses/ai-video",
  },
  {
    id: "automation",
    no: 4,
    name: "自動化副本",
    emoji: "⚙️",
    subtitle: "流程的解放",
    boss: "重複勞動怪",
    bossDesc: "打造自動化流程、讓 AI 幫你跑工作",
    tools: ["Zapier", "Make", "n8n"],
    color: "from-orange-400 to-yellow-500",
    border: "border-orange-400/30 bg-orange-400/5",
    href: "/courses/ai-automation",
  },
  {
    id: "code",
    no: 5,
    name: "程式副本",
    emoji: "💻",
    subtitle: "邏輯的宇宙",
    boss: "BUG 混沌蟲",
    bossDesc: "寫程式、除錯能力、打造你的數位作品",
    tools: ["GitHub Copilot", "Cursor", "Replit"],
    color: "from-pink-400 to-rose-500",
    border: "border-pink-400/30 bg-pink-400/5",
    href: "/courses/ai-coding",
  },
];

export function MissionDungeons() {
  return (
    <section className="border-b border-[var(--color-border)] py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">⚔️ AI 任務副本系統</h2>
          <p className="text-[var(--color-fg-muted)]">5 大任務副本、挑戰你的 AI 實戰力</p>
        </div>

        {/* 副本總覽圖 */}
        <div className="mb-12">
          <Image
            src="/mascot/mission-dungeons.png"
            alt="AI 任務副本系統：5 大副本挑戰"
            width={1200}
            height={700}
            sizes="(max-width: 768px) 100vw, 896px"
            className="w-full max-w-4xl mx-auto h-auto rounded-2xl shadow-xl border border-[var(--color-border)]"
          />
        </div>

        {/* 副本卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DUNGEONS.map((d) => (
            <Link
              key={d.id}
              href={d.href as any}
              className={`group rounded-xl border ${d.border} p-5 hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br ${d.color} text-black`}
                  >
                    {d.no}
                  </div>
                  <span className="text-2xl">{d.emoji}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                  BOSS
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">{d.name}</h3>
              <div className="text-xs text-[var(--color-fg-muted)] mb-3">{d.subtitle}</div>

              <div className="text-sm mb-3">
                <div className="font-semibold mb-1">👹 {d.boss}</div>
                <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">
                  {d.bossDesc}
                </p>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="text-[10px] text-[var(--color-fg-muted)] mb-1">推薦工具</div>
                <div className="flex flex-wrap gap-1">
                  {d.tools.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 text-sm text-[var(--color-fg-muted)]">
          不同的任務、搭配最強 AI 組合、通關效率翻倍！
        </div>
      </div>
    </section>
  );
}
