"use client";
import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";

/**
 * Prompt 實驗室 — 同一個 prompt、比多種輸出（不同「脾氣」/溫度），
 * 學會用尺規判斷哪個好。無碼、可用 config 換場景、也有內建預設。
 * 這是 AI 全系列（寫作/行銷/prompt 工程）的通用互動教具。
 */

type Variant = { label: string; tag: string; output: string; good: boolean; why: string };
type Scenario = { id: string; task: string; prompt: string; criteria: string[]; variants: Variant[] };

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "cold-dialogue",
    task: "冷場對白（兩個有過去的人假裝陌生）",
    prompt: "接著往下寫 150 字。她推開咖啡館的門，窗邊的舊男人沒抬頭。寫出「假裝陌生」的冷感，用對白推進、不要動作場面。台灣中文。",
    criteria: ["Show don't tell（演出來，不是用講的）", "有沒有『冷感』", "中文自不自然"],
    variants: [
      {
        label: "A 版",
        tag: "細膩派（低溫、留白）",
        output: "「一杯美式。」她在他對面坐下，沒問可不可以。\n「這裡有人。」他終於抬眼。\n「我知道。三年了，你連謊都學會了。」\n他指節在杯緣敲了兩下——那是他緊張時的老毛病。\n「小姐，妳認錯人了。」\n「嗯。那就當我認錯。」",
        good: true,
        why: "用「指節敲杯緣」演出緊張（Show）、靠短句留白做出冷感、「你連謊都學會了」是自然台灣口語。三把尺全過。",
      },
      {
        label: "B 版",
        tag: "多面手（高溫、形容詞多）",
        output: "她優雅地走向窗邊，臉上帶著一絲神秘的微笑。\n男人猛地抬頭，眼神中閃過複雜的情緒，內心波濤洶湧。\n「我們……認識嗎？」他顫抖著問。\n回憶如潮水般湧上心頭，那些甜蜜又痛苦的過往。兩人之間的空氣凝固了。",
        good: false,
        why: "「內心波濤洶湧」「回憶如潮水般湧上」是直接『講』情緒（Tell）、濫情蓋掉了冷感、「空氣凝固了」是翻譯腔套語。三把尺全不過。",
      },
    ],
  },
  {
    id: "blog-hook",
    task: "部落格開頭（Figma 新手教學）",
    prompt: "幫一篇『Figma 新手做第一張海報』的部落格寫開頭（150 字），要有鉤子、讓完全沒用過的人想讀下去。",
    criteria: ["有沒有具體場景/痛點", "有沒有『只有作者知道』的經驗", "是不是泛泛套話"],
    variants: [
      {
        label: "A 版",
        tag: "加了作者經驗",
        output: "我第一次打開 Figma，盯著空白畫布愣了五分鐘——按鈕好多，不知道從哪點。後來發現，做一張堪用的海報其實只要 5 個動作。這篇就用我當初卡關的順序帶你走一遍，包括那個害我匯出圖糊掉、找了半天的設定。",
        good: true,
        why: "有具體場景（愣五分鐘）、有只有作者知道的經驗（匯出糊掉的坑）、讓人想知道答案。這就是 E-E-A-T 的 Experience。",
      },
      {
        label: "B 版",
        tag: "AI 直出",
        output: "在當今的數位時代，設計能力變得越來越重要。Figma 是一款強大的設計工具，適合初學者使用。本文將介紹如何使用 Figma 製作您的第一張海報，讓您輕鬆上手，開啟設計之旅。",
        good: false,
        why: "「當今的數位時代」「強大的工具」「開啟設計之旅」全是泛泛套話、沒有任何具體場景或作者經驗，跟哪篇都一樣。",
      },
    ],
  },
];

export function PromptLab({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const scenarios = (config?.scenarios as Scenario[] | undefined) ?? DEFAULT_SCENARIOS;
  const [si, setSi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);
  const S = scenarios[si];
  const answer = S.variants.findIndex((v) => v.good);

  const pick = (i: number) => { setGuess(i); setRevealed(true); };
  const switchScenario = (i: number) => { setSi(i); setRevealed(false); setGuess(null); };

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-elevated">
        <div className="text-sm font-semibold flex items-center gap-1.5">🔬 {title ?? "Prompt 實驗室 · 比一比"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 場景切換 */}
      {scenarios.length > 1 && (
        <div className="p-3 flex flex-wrap gap-1.5 border-b border-border">
          {scenarios.map((s, i) => (
            <button key={s.id} onClick={() => switchScenario(i)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${i === si ? "bg-accent text-black border-accent font-semibold" : "bg-bg border-border text-fg-muted hover:border-accent"}`}>
              {s.task.split("（")[0]}
            </button>
          ))}
        </div>
      )}

      {/* 同一個 prompt */}
      <div className="p-3">
        <div className="text-[11px] text-fg-muted mb-1">🧑 兩邊餵的是同一個 prompt：</div>
        <div className="rounded-lg bg-bg-elevated border border-border p-2.5 text-xs leading-relaxed">{S.prompt}</div>
      </div>

      {/* 兩版輸出 */}
      <div className="px-3 pb-1 grid md:grid-cols-2 gap-2">
        {S.variants.map((v, i) => {
          const isAns = i === answer;
          return (
            <div key={i} className={`rounded-lg border p-2.5 transition ${revealed && isAns ? "border-green-500/50 bg-green-500/5" : revealed ? "border-border opacity-70" : "border-border"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold">🤖 {v.label}</span>
                {revealed && <span className="text-[10px] text-fg-muted">{v.tag}</span>}
              </div>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans text-fg">{v.output}</pre>
              {!revealed && (
                <button onClick={() => pick(i)} className="mt-2 w-full text-xs py-1 rounded bg-accent/15 text-accent hover:bg-accent/25 transition">選這個比較好</button>
              )}
              {revealed && (
                <div className={`mt-2 text-[11px] leading-relaxed rounded p-2 ${isAns ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-bg-elevated text-fg-muted"}`}>
                  {isAns ? "✅ 較好：" : "⚠️ 較弱："}{v.why}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 尺規 + 結果 */}
      <div className="p-3 pt-2">
        <div className="text-[11px] text-fg-muted mb-1">📏 判斷用的三把尺：</div>
        <ul className="text-[11px] text-fg-muted space-y-0.5 mb-2">
          {S.criteria.map((c, i) => <li key={i} className="flex gap-1.5"><Check size={12} className="text-accent shrink-0 mt-0.5" />{c}</li>)}
        </ul>
        <div className="flex items-center gap-2">
          <button onClick={() => setRevealed((v) => !v)} className="text-[11px] px-2 py-1 rounded bg-bg-elevated text-fg-muted hover:text-accent inline-flex items-center gap-1">
            {revealed ? <><EyeOff size={12} /> 收起評註</> : <><Eye size={12} /> 直接看評註</>}
          </button>
          {revealed && guess !== null && (
            <span className={`text-[11px] font-semibold ${guess === answer ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
              {guess === answer ? "你選對了！你的眼睛練起來了 👀" : "你選的是較弱的那版——看評註了解差在哪"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
