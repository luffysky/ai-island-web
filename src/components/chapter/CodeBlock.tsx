"use client";

import { useState, useRef } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lang = className?.match(/language-(\w+)/)?.[1] ?? "";

  const handleCopy = async () => {
    if (!containerRef.current) return;
    const text = containerRef.current.innerText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const range = document.createRange();
      range.selectNode(containerRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.execCommand("copy");
      window.getSelection()?.removeAllRanges();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="my-3 rounded-lg border border-border bg-[#1a1a1a]"
      style={{ maxWidth: "100%", overflow: "hidden" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-border">
        <span className="text-xs text-fg-muted font-mono">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-white/10 transition text-fg-muted shrink-0"
          aria-label="複製"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">已複製</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>複製</span>
            </>
          )}
        </button>
      </div>

      {/* Scrollable container - 包 pre 而非 pre 自己 scroll、避免 padding 跟 scroll 衝突 */}
      <div
        ref={containerRef}
        className="overflow-x-auto"
        style={{
          maxWidth: "100%",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <pre
          className={`p-4 text-sm leading-relaxed ${className ?? ""}`}
          style={{
            // 關鍵：pre 不換行、寬度由內容決定（>= 100%）、由父層 overflow scroll
            margin: 0,
            whiteSpace: "pre",
            wordWrap: "normal",
            // 確保 padding 之後內容能完整顯示
            display: "inline-block",
            minWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}
