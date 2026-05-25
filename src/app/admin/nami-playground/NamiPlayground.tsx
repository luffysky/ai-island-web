"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePyodide } from "@/hooks/usePyodide";
import { Terminal, BookOpen, Bug, BarChart3, Sparkles, Database, GraduationCap, Zap } from "lucide-react";
import { PythonREPL } from "./tabs/PythonREPL";
import { NotebookTab } from "./tabs/NotebookTab";
import { ScrapeLab } from "./tabs/ScrapeLab";
import { ChartsGallery } from "./tabs/ChartsGallery";
import { DataLab } from "./tabs/DataLab";
import { Exercises } from "./tabs/Exercises";
import { BackendLab } from "./tabs/BackendLab";

const TABS = [
  { id: "repl", label: "Python REPL", emoji: "🐍", icon: Terminal, desc: "互動式 Python、一次跑一段" },
  { id: "notebook", label: "Jupyter Notebook", emoji: "📓", icon: BookOpen, desc: "多 cell 編寫、變數共享" },
  { id: "scrape", label: "Scrape Lab", emoji: "🕷️", icon: Bug, desc: "爬蟲練習場、業界資料源" },
  { id: "backend", label: "Backend Lab", emoji: "⚡", icon: Zap, desc: "FastAPI / Flask / SQLite / asyncio" },
  { id: "datalab", label: "Data Lab", emoji: "📊", icon: Database, desc: "真實數據分析、業界題型" },
  { id: "exercises", label: "練習題", emoji: "📝", icon: GraduationCap, desc: "出題 + 解答 (隱藏)" },
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
  // 一進入就背景預載 Pyodide、避免用戶按 Run 卡 5-10 秒
  const { status: pyStatus, progress: pyProgress } = usePyodide(true);

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
              爬蟲 / 數據 / 視覺化 — 全在瀏覽器跑、不打 server
              <span className="hidden md:inline">· 你好 @{username}</span>
            </p>
            <div className="mt-2 text-[10px] inline-flex items-center gap-1">
              {pyStatus === "loading" && (
                <span className="text-yellow-400 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  Python runtime 載入中（{pyProgress || "首次 ~5MB"}）...
                </span>
              )}
              {pyStatus === "ready" && (
                <span className="text-emerald-400 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Python ready · 按 Run 立刻跑
                </span>
              )}
              {pyStatus === "idle" && (
                <span className="text-fg-muted">Python runtime 待載入（按 Run 自動觸發）</span>
              )}
              {pyStatus === "error" && (
                <span className="text-red-400">⚠️ Python 載入失敗、重新整理頁面</span>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto bg-bg-card border border-border rounded-2xl p-1.5 sticky top-0 z-10 backdrop-blur-md">
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
      </nav>

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
          {active === "datalab" && <DataLab />}
          {active === "exercises" && <Exercises />}
          {active === "charts" && <ChartsGallery />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
