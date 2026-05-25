"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePyodide } from "@/hooks/usePyodide";
import { Terminal, BookOpen, Bug, BarChart3, Sparkles, Database, GraduationCap, Zap, Globe, Atom, Trophy, FolderOpen, GripVertical } from "lucide-react";
import { PythonREPL } from "./tabs/PythonREPL";
import { NotebookTab } from "./tabs/NotebookTab";
import { ScrapeLab } from "./tabs/ScrapeLab";
import { ChartsGallery } from "./tabs/ChartsGallery";
import { DataLab } from "./tabs/DataLab";
import { Exercises } from "./tabs/Exercises";
import { BackendLab } from "./tabs/BackendLab";
import { WebLab } from "./tabs/WebLab";
import { FrameworkLab } from "./tabs/FrameworkLab";
import { ChallengeMode } from "./tabs/ChallengeMode";
import { MiniIDE } from "./tabs/MiniIDE";
import { DatabaseLab } from "./tabs/DatabaseLab";

/** Tab 列 drag-to-scroll wrapper — 滑鼠按住拖 / touch swipe / 滑鼠滾輪橫向 */
function DraggableTabs({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ down: boolean; startX: number; scrollLeft: number; moved: boolean } | null>(null);

  // 滑鼠滾輪 vertical → 橫向 scroll
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !d.down || !el) return;
    const dx = e.pageX - d.startX;
    if (Math.abs(dx) > 3) d.moved = true;
    el.scrollLeft = d.scrollLeft - dx;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    if (!el) return;
    if (d?.moved) {
      // 防點擊 (剛剛是 drag)
      e.preventDefault();
      e.stopPropagation();
    }
    drag.current = null;
    el.style.cursor = "grab";
    el.style.userSelect = "";
    try { el.releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <nav
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="flex gap-1 overflow-x-auto overflow-y-hidden bg-bg-card border border-border rounded-2xl p-1.5 sticky top-0 z-10 backdrop-blur-md scrollbar-hide cursor-grab select-none"
      style={{ scrollbarWidth: "thin" }}
      title="按住拖曳切換、或滑鼠滾輪左右滾"
    >
      <span className="flex items-center px-1 text-fg-muted/50 pointer-events-none">
        <GripVertical size={12} />
      </span>
      {children}
      <span className="flex items-center px-1 text-fg-muted/50 pointer-events-none">
        <GripVertical size={12} />
      </span>
    </nav>
  );
}

const TABS = [
  { id: "repl", label: "Python REPL", emoji: "🐍", icon: Terminal, desc: "互動式 Python、一次跑一段" },
  { id: "notebook", label: "Jupyter Notebook", emoji: "📓", icon: BookOpen, desc: "多 cell 編寫、變數共享" },
  { id: "ide", label: "Mini IDE", emoji: "💻", icon: FolderOpen, desc: "多檔案、main.py 可 import" },
  { id: "scrape", label: "Scrape Lab", emoji: "🕷️", icon: Bug, desc: "爬蟲練習場、業界資料源" },
  { id: "backend", label: "Backend Lab", emoji: "⚡", icon: Zap, desc: "FastAPI / Flask / SQLite / asyncio" },
  { id: "web", label: "Web Lab", emoji: "🌐", icon: Globe, desc: "HTML / CSS / JS 即時預覽" },
  { id: "framework", label: "Frameworks", emoji: "⚛️", icon: Atom, desc: "React / Vue / Next / Nest" },
  { id: "datalab", label: "Data Lab", emoji: "📊", icon: Database, desc: "真實數據分析、業界題型" },
  { id: "dblab", label: "Database Lab", emoji: "🗄️", icon: Database, desc: "SQLite live + Postgres/MySQL/Mongo/Supabase" },
  { id: "exercises", label: "練習題", emoji: "📝", icon: GraduationCap, desc: "出題 + 解答 (隱藏)" },
  { id: "challenges", label: "挑戰模式", emoji: "🏆", icon: Trophy, desc: "通過題目拿 XP、進度存 DB" },
  { id: "charts", label: "Charts Gallery", emoji: "📈", icon: BarChart3, desc: "matplotlib / recharts 圖表" },
] as const;

type TabId = typeof TABS[number]["id"];

export function NamiPlayground({
  username,
  displayName,
  avatarUrl,
}: {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const [active, setActive] = useState<TabId>("repl");
  // 一進入預載所有套件 (numpy/pandas/matplotlib/sklearn/fastapi/...)、ready 後保證可跑
  const py = usePyodide(true);
  const { status: pyStatus, progress: pyProgress, reset: pyReset } = py;
  const [resetMsg, setResetMsg] = useState("");

  const handleReset = async () => {
    setResetMsg("重設中...");
    await pyReset();
    setResetMsg("✨ 已清空變數");
    setTimeout(() => setResetMsg(""), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-amber-500/10 p-5"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="relative flex items-center gap-3 flex-wrap">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-14 h-14 rounded-full object-cover ring-4 ring-bg-card shadow-xl" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-2xl font-bold text-black ring-4 ring-bg-card shadow-xl">
                🌊
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 text-base">🐍</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300 bg-clip-text text-transparent">
              Nami 練習用 · Python Playground
            </h1>
            <p className="text-xs md:text-sm text-fg-muted mt-1 inline-flex items-center gap-1.5 flex-wrap">
              <Sparkles size={11} className="text-yellow-400" />
              爬蟲 / 數據 / 視覺化 / 後端 / 前端 — 全在瀏覽器跑、不打 server
              <span className="hidden md:inline">· 你好 @{username}</span>
            </p>
            <div className="mt-2 relative">
              {pyStatus === "loading" && (
                <div className="bg-bg p-2.5 rounded-lg border border-yellow-500/30 space-y-1.5 max-w-xl">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-fg-muted font-mono">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse mr-1" />
                      ({py.phaseIdx + 1}/{py.phaseTotal}) <b className="text-yellow-300">{py.phaseName}</b>
                    </span>
                    <span className="text-fg-muted font-mono whitespace-nowrap">
                      {py.elapsedSec}s / 約 {py.estTotalSec}s
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 transition-all duration-300"
                      style={{ width: `${py.progressPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-fg-muted">
                    剩約 {py.estRemainSec}s · 第一次慢、之後重整有 cache 秒進 · 全套件預載後保證所有 Tab 可跑
                  </div>
                </div>
              )}
              {pyStatus === "ready" && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 inline-flex items-center gap-2 flex-wrap max-w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300 text-[11px] font-bold">
                    Python ready · 全套件就緒
                  </span>
                  {py.elapsedSec > 0 && <span className="text-[10px] text-fg-muted">首載 {py.elapsedSec}s</span>}
                  <button
                    onClick={handleReset}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-orange-400/30 text-orange-400 hover:bg-orange-400/10"
                  >
                    🔄 重設 kernel
                  </button>
                  {resetMsg && <span className="text-emerald-400 text-[10px]">{resetMsg}</span>}
                </div>
              )}
              {pyStatus === "idle" && (
                <span className="text-[10px] text-fg-muted">Python runtime 待載入...</span>
              )}
              {pyStatus === "error" && (
                <span className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
                  ⚠️ Python 載入失敗、重新整理頁面再試
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Tabs — drag to scroll (滑鼠按住拖、touch swipe) */}
      <DraggableTabs>
        {TABS.map((t) => {
          const isActive = active === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`relative flex-1 min-w-fit px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${isActive ? "text-black" : "text-fg-muted hover:text-fg"}`}
            >
              {isActive && (
                <motion.div
                  layoutId="nami-tab-bg"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400"
                  transition={{ duration: 0.25 }}
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                <Icon size={14} />
                <span>{t.label}</span>
              </span>
            </button>
          );
        })}
      </DraggableTabs>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {active === "repl" && <PythonREPL />}
          {active === "notebook" && <NotebookTab />}
          {active === "scrape" && <ScrapeLab />}
          {active === "backend" && <BackendLab />}
          {active === "web" && <WebLab />}
          {active === "framework" && <FrameworkLab />}
          {active === "datalab" && <DataLab />}
          {active === "dblab" && <DatabaseLab />}
          {active === "exercises" && <Exercises />}
          {active === "challenges" && <ChallengeMode />}
          {active === "ide" && <MiniIDE />}
          {active === "charts" && <ChartsGallery />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
