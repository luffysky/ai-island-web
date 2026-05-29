"use client";

import { useState } from "react";
import { Search, Download } from "lucide-react";
import { CopyButton } from "./CopyButton";

/**
 * AI 對話頂部工具列：搜尋 + 整段複製 / 匯出
 *
 * 林董要求：
 *   - 頂部加搜尋框、快速找舊對話
 *   - 整個對話框聊天記錄可複製 / 分享
 */
export function ChatToolbar({
  onSearch,
  exportText,
  exportFileName = "ai-chat.txt",
  placeholder = "搜尋對話...",
}: {
  onSearch?: (q: string) => void;
  exportText?: string; // 整段對話純文字（要複製 / 下載的內容）
  exportFileName?: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");

  const download = () => {
    if (!exportText) return;
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-card/50">
      {onSearch && (
        <div className="flex-1 relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); onSearch(e.target.value); }}
            placeholder={placeholder}
            className="w-full pl-6 pr-2 py-1 bg-bg border border-border rounded text-xs outline-none focus:border-accent"
          />
        </div>
      )}
      {exportText && (
        <>
          <CopyButton text={exportText} label="複製全部" />
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-accent transition"
            title="下載對話"
          >
            <Download size={11} />
            匯出
          </button>
        </>
      )}
    </div>
  );
}
