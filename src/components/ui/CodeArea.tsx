"use client";

import { useEffect, useRef } from "react";

/**
 * 共用 code 編輯區
 * - Tab / Shift+Tab：縮排 4 space / 取消縮排
 * - Enter：自動繼承當前縮排、行尾是 ':' 多加 4 space (Python style)
 * - Cmd/Ctrl+Enter：呼叫 onRun
 * - storageKey：給就 autosave localStorage (debounced 500ms)
 */
export function CodeArea({
  value,
  onChange,
  onRun,
  storageKey,
  className = "",
  style,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  storageKey?: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // autosave
  useEffect(() => {
    if (!storageKey) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(`nami:${storageKey}`, value);
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [storageKey, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd } = ta;

    // Cmd/Ctrl + Enter → Run
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.();
      return;
    }

    // Tab / Shift+Tab
    if (e.key === "Tab") {
      e.preventDefault();
      const isMulti = selectionStart !== selectionEnd && value.substring(selectionStart, selectionEnd).includes("\n");

      if (isMulti) {
        // 多行：每行加 / 移 4 space
        const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        const block = value.substring(lineStart, selectionEnd);
        let newBlock: string;
        if (e.shiftKey) {
          newBlock = block.split("\n").map((l) => l.startsWith("    ") ? l.slice(4) : l.replace(/^\s{1,3}/, "")).join("\n");
        } else {
          newBlock = block.split("\n").map((l) => "    " + l).join("\n");
        }
        const newValue = value.substring(0, lineStart) + newBlock + value.substring(selectionEnd);
        onChange(newValue);
        setTimeout(() => {
          ta.selectionStart = lineStart;
          ta.selectionEnd = lineStart + newBlock.length;
        }, 0);
      } else {
        if (e.shiftKey) {
          // 單行 outdent
          const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
          const linePrefix = value.substring(lineStart, lineStart + 4);
          if (linePrefix.startsWith("    ")) {
            onChange(value.substring(0, lineStart) + value.substring(lineStart + 4));
            setTimeout(() => {
              ta.selectionStart = ta.selectionEnd = Math.max(lineStart, selectionStart - 4);
            }, 0);
          }
        } else {
          // 單行 indent
          onChange(value.substring(0, selectionStart) + "    " + value.substring(selectionEnd));
          setTimeout(() => {
            ta.selectionStart = ta.selectionEnd = selectionStart + 4;
          }, 0);
        }
      }
      return;
    }

    // Enter 自動繼承縮排
    if (e.key === "Enter") {
      const before = value.substring(0, selectionStart);
      const lineStart = before.lastIndexOf("\n") + 1;
      const currentLine = value.substring(lineStart, selectionStart);
      const indentMatch = currentLine.match(/^[ \t]*/);
      const indent = indentMatch ? indentMatch[0] : "";
      const trimmed = currentLine.trimEnd();
      const extra = trimmed.endsWith(":") || trimmed.endsWith("{") ? "    " : "";
      const insert = "\n" + indent + extra;

      e.preventDefault();
      onChange(value.substring(0, selectionStart) + insert + value.substring(selectionEnd));
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = selectionStart + insert.length;
      }, 0);
      return;
    }

    // 自動配對括號 / 引號
    const pairs: Record<string, string> = {
      "(": ")",
      "[": "]",
      "{": "}",
      "'": "'",
      '"': '"',
      "`": "`",
    };
    if (pairs[e.key]) {
      const close = pairs[e.key];
      if (selectionStart === selectionEnd) {
        e.preventDefault();
        onChange(value.substring(0, selectionStart) + e.key + close + value.substring(selectionEnd));
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = selectionStart + 1;
        }, 0);
      } else {
        // 把選的字串包起來
        const selected = value.substring(selectionStart, selectionEnd);
        e.preventDefault();
        onChange(value.substring(0, selectionStart) + e.key + selected + close + value.substring(selectionEnd));
        setTimeout(() => {
          ta.selectionStart = selectionStart + 1;
          ta.selectionEnd = selectionEnd + 1;
        }, 0);
      }
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      placeholder={placeholder}
      className={`bg-[#0d1117] text-[#e6edf3] font-mono text-xs outline-none border-0 resize-none leading-relaxed ${className}`}
      style={{ tabSize: 4, ...style }}
    />
  );
}

/**
 * 取回 autosave 的值 (給 useState initializer)
 */
export function loadCodeAreaValue(storageKey: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(`nami:${storageKey}`) ?? fallback;
  } catch {
    return fallback;
  }
}
