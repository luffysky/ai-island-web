"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { chaptersLite } from "@/data/chapters-lite";

const TOUR_CHAPTERS = chaptersLite.length;
const TOUR_LESSONS = chaptersLite.reduce((s, c) => s + c.lessonIds.length, 0);

/**
 * 新手區塊導覽（聚光燈版，比照創作者島 IslandTour）
 * 登入後第一次到 /me、跟著實際 UI 區塊一步步高亮解說。看完 / 略過寫 localStorage + DB、不再煩。
 * 每步可帶多個 selector（桌機/手機導覽列不同）→ 取第一個「畫得出來」的當目標；找不到就置中。
 */
const STORAGE_KEY = "ai_island_tour_done_v1";

type Step = { sel?: string[]; emoji: string; title: string; body: string; href?: string; cta?: string };

const STEPS: Step[] = [
  { emoji: "🌴", title: "歡迎登島！30 秒帶你逛一圈", body: "AI 島陪你從零開始學程式。這個導覽會一路指給你看每個區塊在哪。" },
  { sel: ["[data-tour=pet]"], emoji: "🐹", title: "右下角的綠寶 & 寵物", body: "牠記得你的學習狀態、會主動講話。卡關直接點牠問——整本 AI 島牠都讀過。", href: "/me/pet", cta: "管理寵物" },
  { sel: ["[data-tour=topnav]", "[data-tour=bottomnav]"], emoji: "🧭", title: "導覽列", body: "章節、討論區、排行榜、設定都從這裡去。找不到路就看這排。" },
  { sel: ["[data-tour=me-hero]", "[data-tour=me-main]"], emoji: "🎯", title: "你的主頁", body: `每日任務、連勝、等級都在這。每天回來簽到、做任務、升等拿 Z-coin。` },
  { emoji: "📚", title: `${TOUR_CHAPTERS} 章 × ${TOUR_LESSONS}+ 小節`, body: "選一條職涯路線跟著走。不知道從哪開始，就從「ch00 環境準備」。", href: "/chapters", cta: "看章節地圖" },
  { emoji: "⚙️", title: "綁 LINE / Discord（選配）", body: "在「設定」綁 LINE 收推播、綁 Discord 拿 VIP 名牌。準備好就開始吧！", href: "/settings", cta: "去設定" },
];

export function OnboardingTour() {
  const { status } = useAuth();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (status !== "in" || checkedRef.current) return;
    checkedRef.current = true;
    try { if (localStorage.getItem(STORAGE_KEY) === "1") return; } catch { /* ignore */ }
    const allow = pathname === "/" || pathname === "/me" || pathname === "/chapters";
    if (!allow) return;
    fetch("/api/me/onboarding-state").then((r) => r.json()).then((j) => {
      if (j?.tour_completed_at) { try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ } return; }
      setTimeout(() => setOpen(true), 1200);
    }).catch(() => setTimeout(() => setOpen(true), 1200));
  }, [status, pathname]);

  const measure = useCallback(() => {
    const sels = STEPS[i]?.sel;
    if (!sels) { setRect(null); return; }
    let el: HTMLElement | null = null;
    for (const s of sels) {
      const cand = document.querySelector(s) as HTMLElement | null;
      if (cand) { const r = cand.getBoundingClientRect(); if (r.width > 4 && r.height > 4) { el = cand; break; } }
    }
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setRect(el!.getBoundingClientRect()), 280);
  }, [i]);

  useEffect(() => { if (open) measure(); }, [open, i, measure]);
  useEffect(() => {
    if (!open) return;
    const h = () => measure();
    window.addEventListener("resize", h); window.addEventListener("scroll", h, true);
    return () => { window.removeEventListener("resize", h); window.removeEventListener("scroll", h, true); };
  }, [open, measure]);

  const finish = async () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    try { await fetch("/api/me/onboarding-state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "tour" }) }); } catch { /* ignore */ }
  };

  const s = STEPS[i];
  const isLast = i === STEPS.length - 1;
  const pad = 8;

  const tip = (() => {
    if (typeof window === "undefined") return { top: 120, left: 12, width: 340 };
    const vw = window.innerWidth, vh = window.innerHeight;
    const W = Math.min(vw * 0.92, 340);
    const estH = 210;
    const navGap = window.matchMedia("(min-width: 768px)").matches ? 16 : 92;
    if (!rect) return { top: Math.max(12, (vh - estH) / 2), left: Math.max(12, (vw - W) / 2), width: W };
    const left = Math.max(12, Math.min(rect.left, vw - W - 12));
    let top = rect.bottom + 12;
    if (top + estH > vh - navGap) top = rect.top - estH - 12;
    top = Math.max(12, Math.min(top, vh - estH - navGap));
    return { top, left, width: W };
  })();

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80]">
        {rect ? (
          <div className="absolute rounded-2xl ring-2 ring-accent pointer-events-none transition-all"
            style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)" }} />
        ) : (
          <div className="absolute inset-0 bg-black/80" />
        )}

        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="absolute z-[81] max-h-[62vh] overflow-y-auto bg-bg-card border border-accent/40 rounded-2xl p-4 shadow-2xl"
          style={{ top: tip.top, left: tip.left, width: tip.width }}>
          <button onClick={finish} aria-label="關閉" className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-fg-muted hover:bg-bg-elevated"><X size={14} /></button>
          <div className="text-[10px] text-fg-muted mb-1 inline-flex items-center gap-1"><Sparkles size={10} className="text-accent" /> 新手導覽 {i + 1}/{STEPS.length}</div>
          <div className="text-3xl mb-1.5">{s.emoji}</div>
          <div className="font-bold">{s.title}</div>
          <p className="text-sm text-fg-muted mt-1 leading-relaxed">{s.body}</p>
          <div className="flex items-center gap-2 mt-3">
            {s.href && <Link href={s.href as any} onClick={finish} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent transition">{s.cta}</Link>}
            <button onClick={finish} className="text-xs text-fg-muted hover:text-fg ml-auto">略過</button>
            {i > 0 && <button onClick={() => setI(i - 1)} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated">上一步</button>}
            <button onClick={() => (isLast ? finish() : setI(i + 1))} className="text-xs px-4 py-1.5 rounded-full bg-accent text-black font-bold">{isLast ? "開始學習" : "下一步"}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
