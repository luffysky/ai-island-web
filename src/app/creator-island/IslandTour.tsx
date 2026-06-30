"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";

type Step = { sel?: string; title: string; body: string };

const STEPS: Step[] = [
  { title: "🎨 歡迎來到創作者島嶼", body: "這裡把你散落的靈感「碎片」，一路長成完整作品。30 秒帶你逛一圈。" },
  { sel: "[data-tour=hud]", title: "🪙 你的狀態列", body: "Dust（開蛋用的創作資源，每天免費補）、碎片數，還有綠寶 ✨ 一路陪你創作。" },
  { sel: "[data-tour=egg]", title: "🥚 今日碎片蛋", body: "沒靈感？敲開一顆，從全站一萬顆碎片庫扭蛋抽靈感——有機會抽到稀有 SSR！" },
  { sel: "[data-tour=capture]", title: "✍️ 捕捉碎片", body: "把任何一句想法、回憶、畫面寫下來。也能用 🎤 語音、📷 拍照存成碎片。" },
  { sel: "[data-tour=explore]", title: "🔗 探索 & 工作流", body: "「意外配對」幫你找出語意遠卻有張力的組合；「工作流」能錄下你的創作步驟、一鍵重播。" },
  { sel: "[data-tour=forest]", title: "🌲 碎片森林", body: "你的碎片都在這。點選後底部會浮出工具：🧲凝聚、🌿演化、🧵編織、🌏轉譯、💡問 AI 適合做什麼。把卡片拖到分類上＝複製進該類。" },
  { sel: "[data-tour=nav-create]", title: "✨ 創作引擎", body: "不想只玩碎片？這裡可直接開寫——小說/故事/歌詞/詩/劇本/文章/文案，每種都帶齊專屬工具（章節大綱、押韻、Suno、分鏡…）＋綠寶隨側續寫改寫。編織完的成品也能一鍵導入這裡接著寫。" },
  { sel: "[data-tour=nav-works]", title: "📚 作品庫", body: "編織出的成品（文章/歌/小說…）都收在這，可編輯、發布到部落格、看「創作家譜」由哪些碎片長成。" },
  { sel: "[data-tour=nav-studio]", title: "🏢 工作室", body: "和夥伴一起創作的團隊空間——有自己的島、碎片與作品，可邀請成員、共用 Z 幣錢包。" },
  { sel: "[data-tour=nav-market]", title: "🏪 市集", body: "用 Z 幣交易碎片/作品（抽成 0%），還有「靈感精選」可直接帶回你的島。" },
  { sel: "[data-tour=nav-community]", title: "🌐 社群", body: "發文、圖/影/音、限動、短影音、按讚留言、加好友、私訊——完整的創作者社群。" },
  { sel: "[data-tour=nav-growth]", title: "📈 成長", body: "AI 分析你的「創作 DNA」（風格指紋、強項），陪你看見自己怎麼一步步變強。" },
  { title: "🚀 開始創作吧", body: "先按「種 300 顆 🌱」讓島長滿靈感，或直接寫下第一句。隨時點右下「導覽」可再看一次。" },
];

const SEEN_KEY = "ci_tour_seen_v1";

export function IslandTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => { if (!localStorage.getItem(SEEN_KEY)) { setOpen(true); } }, []);

  const measure = useCallback(() => {
    const step = STEPS[i];
    if (!step?.sel) { setRect(null); return; }
    const el = document.querySelector(step.sel) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setRect(el.getBoundingClientRect()), 280);
  }, [i]);

  useEffect(() => { if (open) measure(); }, [open, i, measure]);
  useEffect(() => {
    if (!open) return;
    const h = () => measure();
    window.addEventListener("resize", h); window.addEventListener("scroll", h, true);
    return () => { window.removeEventListener("resize", h); window.removeEventListener("scroll", h, true); };
  }, [open, measure]);

  function close() { setOpen(false); localStorage.setItem(SEEN_KEY, "1"); }
  function start() { setI(0); setOpen(true); }
  const step = STEPS[i];
  const pad = 8;

  // tooltip 位置：永遠回傳數值座標（不靠 CSS transform 置中，否則會被 framer 的 transform 蓋掉 → 跑出邊界）。
  const tip = (() => {
    if (typeof window === "undefined") return { top: 120, left: 12, width: 340 };
    const vw = window.innerWidth, vh = window.innerHeight;
    const W = Math.min(vw * 0.92, 340);
    const estH = 220;                                   // 卡片高度上限估計（卡片本身有 max-h + 捲動）
    const navGap = window.matchMedia("(min-width: 768px)").matches ? 16 : 92; // 清開底部導覽列
    if (!rect) {
      // 無目標（歡迎/結尾步）→ 用數值置中
      return { top: Math.max(12, (vh - estH) / 2), left: Math.max(12, (vw - W) / 2), width: W };
    }
    const left = Math.max(12, Math.min(rect.left, vw - W - 12));
    let top = rect.bottom + 12;                         // 預設：目標下方
    if (top + estH > vh - navGap) top = rect.top - estH - 12; // 下方放不下 → 上方
    top = Math.max(12, Math.min(top, vh - estH - navGap));
    return { top, left, width: W };
  })();

  return (
    <>
      <button onClick={start} title="導覽" className="fixed bottom-[5.5rem] md:bottom-4 right-4 z-[55] w-11 h-11 rounded-full bg-accent text-white shadow-lg grid place-items-center hover:scale-105 transition"><HelpCircle size={20} /></button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60]">
            {/* 聚光：目標清楚、其他變暗（box-shadow 9999px 技法）*/}
            {rect ? (
              <div className="absolute rounded-xl ring-2 ring-accent pointer-events-none transition-all"
                style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)" }} />
            ) : (
              <div className="absolute inset-0 bg-black/80" />
            )}

            {/* 說明卡 */}
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="absolute z-[61] w-[min(92vw,340px)] max-h-[60vh] overflow-y-auto bg-bg-card border border-accent/40 rounded-2xl p-4 shadow-2xl"
              style={{ top: tip.top, left: tip.left, width: tip.width }}>
              <div className="font-bold">{step.title}</div>
              <p className="text-sm text-fg-muted mt-1.5 leading-relaxed">{step.body}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-fg-muted">{i + 1} / {STEPS.length}</span>
                <div className="flex gap-2 text-sm">
                  <button onClick={close} className="px-3 py-1.5 rounded-full bg-bg-elevated text-fg-muted">略過</button>
                  {i > 0 && <button onClick={() => setI(i - 1)} className="px-3 py-1.5 rounded-full bg-bg-elevated">上一步</button>}
                  {i < STEPS.length - 1
                    ? <button onClick={() => setI(i + 1)} className="px-4 py-1.5 rounded-full bg-accent text-white font-bold">下一步</button>
                    : <button onClick={close} className="px-4 py-1.5 rounded-full bg-accent text-white font-bold">開始創作</button>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
