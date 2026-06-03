"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { chaptersLite } from "@/data/chapters-lite";

// 動態課數（用輕量 chapters-lite、不把整包章節打進 bundle）
const TOUR_CHAPTERS = chaptersLite.length;
const TOUR_LESSONS = chaptersLite.reduce((s, c) => s + c.lessonIds.length, 0);

/**
 * 新手 5 步 Tour（A 方案）
 *
 * 林董：「第一次登入、5 步彈出泡泡帶看寵物 / 章節 / AI 導師 / 任務 / 設定」
 *
 * 觸發：登入後第一次到 /me 自動跳、看完 localStorage + DB 標記、不再煩
 * 跳過：右上 X 或「之後再說」也記住、不再煩
 */

const STORAGE_KEY = "ai_island_tour_done_v1";

const STEPS = [
  {
    emoji: "🐹",
    title: "右下角寵物常駐",
    body: "牠會記住你的學習狀態、會主動講話。點牠開聊天面板。",
    href: "/me/pet",
    cta: "去管理寵物",
  },
  {
    emoji: "📚",
    title: `${TOUR_CHAPTERS} 章節 × ${TOUR_LESSONS}+ lessons`,
    body: "選一條職涯路線、跟著走。不知道從哪開始就點「ch00 環境準備」。",
    href: "/chapters",
    cta: "看章節地圖",
  },
  {
    emoji: "✨",
    title: "綠寶 AI 導師",
    body: "頁面右下角浮球、整本 AI 島都讀過、卡關直接問牠。",
    href: "/me/ai-history",
    cta: "看對話歷史",
  },
  {
    emoji: "🎯",
    title: "每日任務 + 連勝",
    body: "每天簽到、做任務、升等、拿 Z-coin。連勝 7 天有大禮。",
    href: "/me",
    cta: "看今日任務",
  },
  {
    emoji: "⚙️",
    title: "綁定 LINE / Discord",
    body: "在「設定」綁 LINE 收推播、綁 Discord 拿 VIP 名牌。",
    href: "/settings",
    cta: "去設定",
  },
];

export function OnboardingTour() {
  const { status } = useAuth();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (status !== "in") return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    // localStorage 先擋（避免 race）
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {}

    // 只在 /me / /chapters / / 首頁 觸發、避免破壞正在做的事
    const allow = pathname === "/" || pathname === "/me" || pathname === "/chapters";
    if (!allow) return;

    // 從 DB 確認一次（跨裝置）
    fetch("/api/me/onboarding-state")
      .then((r) => r.json())
      .then((j) => {
        if (j?.tour_completed_at) {
          try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
          return;
        }
        setTimeout(() => setOpen(true), 1500);
      })
      .catch(() => {
        setTimeout(() => setOpen(true), 1500);
      });
  }, [status, pathname]);

  const finish = async () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    try {
      await fetch("/api/me/onboarding-state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "tour" }) });
    } catch {}
  };

  if (!open) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* progress */}
        <div className="h-1 bg-bg-elevated">
          <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <button onClick={finish} aria-label="關閉" className="absolute top-3 right-3 p-1.5 rounded-full text-fg-muted hover:bg-bg-elevated">
          <X size={14} />
        </button>

        <div className="p-6">
          <div className="text-[10px] text-fg-muted mb-1 inline-flex items-center gap-1">
            <Sparkles size={10} className="text-accent" />
            新手導覽 ({step + 1}/{STEPS.length})
          </div>
          <div className="text-5xl mb-3">{s.emoji}</div>
          <h3 className="text-lg font-bold">{s.title}</h3>
          <p className="text-sm text-fg-muted mt-2 leading-relaxed">{s.body}</p>

          <div className="mt-5 flex items-center gap-2">
            {s.href && (
              <Link
                href={s.href as any}
                onClick={finish}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent transition"
              >
                {s.cta}
              </Link>
            )}
            <button onClick={finish} className="text-xs text-fg-muted hover:text-fg ml-auto">
              先跳過
            </button>
            <button
              onClick={() => (isLast ? finish() : setStep(step + 1))}
              className="text-xs px-4 py-1.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-black font-bold inline-flex items-center gap-1"
            >
              {isLast ? "完成" : "下一步"}
              {!isLast && <ArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
