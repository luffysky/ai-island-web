"use client";

import { MiniIDE } from "../nami-playground/tabs/MiniIDE";

/**
 * Nami IDE — 全屏 IDE 模式
 *
 * /admin/nami-playground 是分頁式練習場 (含 REPL / Notebook / IDE / Scrape Lab 等多 tab)
 * /admin/nami-ide 把 IDE 拉出來獨立、全屏寬高、不被 tab 切割
 *
 * Reuse 既有 MiniIDE component、給足空間。
 * 後續迭代：加 HTML/JS sandbox 預覽、多語言 run、terminal、git status 之類 VSCode 風功能。
 */
export default function NamiIDEPage() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            💻 Nami IDE
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">全屏模式</span>
          </h2>
          <p className="text-xs text-fg-muted mt-1">
            多檔案 IDE、預設跑 Python (Pyodide / Web Worker)、autosave 在瀏覽器 localStorage。
            未來會加 HTML/JS 預覽 + terminal。
          </p>
        </div>
        <a
          href="/admin/nami-playground"
          className="text-xs px-3 py-1.5 rounded-full bg-bg-card border border-border hover:border-purple-400/50 text-fg-muted hover:text-fg transition"
        >
          ← 回 Python Playground (多 tab)
        </a>
      </div>

      <MiniIDE />
    </div>
  );
}
