"use client";

import { LottieIcon } from "@/components/ui/LottieIcon";

// 想換成 Lottie：把 DICT_LOTTIE 設成 LottieFiles 的 lottie.host URL（免費動畫＝Lottie Simple License、可商用免署名）。
// 空字串時自動顯示下方可愛的 CSS 動態 📖 fallback，所以沒設也不會醜。
const DICT_LOTTIE = "";

export function DictHero() {
  return (
    <header className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-bg-card p-6 sm:p-8">
      {/* accent 微漸層當裝飾疊層、底一定是 bg-bg-card（亮暗都讀得到）*/}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-emerald-500/[0.06] to-sky-500/10 pointer-events-none" />
      {/* 漂浮小裝飾：Lottie 自建雙星閃爍（自 host、可商用），載不出來退回 ✨ emoji */}
      <span className="pointer-events-none absolute right-3 top-2 opacity-90">
        <LottieIcon src="/lotties/dict-sparkle.json" size={56} fallback={<span className="text-2xl dict-float">✨</span>} />
      </span>
      <span className="pointer-events-none absolute right-20 bottom-5 text-xl opacity-30 dict-float2">💡</span>

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div className="shrink-0">
          <LottieIcon
            src={DICT_LOTTIE}
            size={64}
            fallback={<span className="text-5xl inline-block dict-bob select-none" role="img" aria-label="辭典">📖</span>}
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            程式辭典
            <span className="text-xs font-semibold bg-accent/15 text-accent px-2 py-0.5 rounded-full align-middle">白話版</span>
          </h1>
          <p className="mt-1 text-fg-muted text-sm leading-relaxed">
            看不懂術語就不敢開始？用「人話 + 生活比喻」講清楚術語、語法，還有工程師黑話。
          </p>
        </div>
      </div>

      <p className="relative mt-3 text-fg-muted text-[13px] leading-relaxed">
        從 <code className="px-1 rounded bg-bg-elevated text-accent">async</code> 到
        <span className="mx-1 px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-500 text-xs">技術債</span>
        <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-500 text-xs">小黃鴨除錯法</span>
        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 text-xs">404</span>
        —— 通通秒懂。
      </p>

      <style>{`
        .dict-bob{animation:dictBob 2.4s ease-in-out infinite;transform-origin:50% 90%}
        @keyframes dictBob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-7px) rotate(4deg)}}
        .dict-float{animation:dictFloat 4s ease-in-out infinite}
        .dict-float2{animation:dictFloat 5.2s ease-in-out infinite .6s}
        @keyframes dictFloat{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-9px);opacity:.7}}
        @media (prefers-reduced-motion: reduce){.dict-bob,.dict-float,.dict-float2{animation:none}}
      `}</style>
    </header>
  );
}
