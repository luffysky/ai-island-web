import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

const TOOLS = [
  { href: "/fortune", emoji: "🔮", title: "每日運勢", desc: "星座今日運勢＋塔羅占卜，正向陪你過每一天", accent: "from-violet-500/15 to-fuchsia-500/15 border-violet-500/25" },
  { href: "/daily", emoji: "🌅", title: "每日情報", desc: "天氣＋生活建議＋每日 AI 單字／一句／Tip，每天回來看", accent: "from-sky-500/15 to-cyan-500/15 border-sky-500/25" },
  { href: "/message-coach", emoji: "💬", title: "訊息軍師", desc: "難開口的話——加薪、婉拒、道歉——幫你講得體", accent: "from-indigo-500/15 to-sky-500/15 border-indigo-500/25" },
  { href: "/me/job-kit", emoji: "🎒", title: "AI 求職包", desc: "履歷、自傳、求職信、模擬面試一站搞定", accent: "from-emerald-500/15 to-teal-500/15 border-emerald-500/25" },
  { href: "/agent/templates", emoji: "🤖", title: "生活助理", desc: "查補助、比價、旅遊規劃、育兒問答…一鍵幫你辦", accent: "from-amber-500/15 to-orange-500/15 border-amber-500/25" },
] as const;

/** 首頁「免費 AI 小工具」— 大眾變現四功能的獲客入口（一般人也用得上）。 */
export function FreeToolsSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 border-b border-border">
      <h2 className="text-3xl font-bold mb-2 inline-flex w-full items-center justify-center gap-2">
        <Sparkles size={26} className="text-accent" /> 免費 AI 小工具
      </h2>
      <p className="text-center text-fg-muted mb-8">不用會寫程式，一般人也用得上——點開就能用</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href as any}
            className={`group rounded-2xl border bg-gradient-to-br ${tool.accent} p-5 flex flex-col hover:-translate-y-0.5 hover:shadow-lg transition`}>
            <div className="text-4xl mb-3">{tool.emoji}</div>
            <div className="font-bold text-lg mb-1">{tool.title}</div>
            <p className="text-sm text-fg-muted flex-1">{tool.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
              開始用 <ArrowRight size={14} className="group-hover:translate-x-0.5 transition" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
