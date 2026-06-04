"use client";

import { useState, useRef, useMemo } from "react";
import { Copy, Check, TerminalSquare, FileCode2, BookOpen } from "lucide-react";
import { CLI_GLOSSARY, extractCliCommands, looksLikeTerminal } from "@/lib/cli-glossary";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

// 友善語言標籤
const LANG_LABEL: Record<string, string> = {
  html: "HTML",
  xml: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  json: "JSON",
  bash: "終端機",
  sh: "終端機",
  shell: "終端機",
  zsh: "終端機",
  console: "終端機",
  powershell: "終端機",
  python: "Python",
  py: "Python",
  sql: "SQL",
  text: "範例",
  plaintext: "範例",
  "": "範例",
};

// 從 React children 遞迴抽純文字（給終端機判定 / 指令小抄用）
function childText(node: React.ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(childText).join("");
  const props = (node as { props?: { children?: React.ReactNode } })?.props;
  if (props?.children) return childText(props.children);
  return "";
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lang = className?.match(/language-(\w+)/)?.[1] ?? "";

  const text = useMemo(() => childText(children), [children]);
  const isTerminal = useMemo(() => looksLikeTerminal(lang, text), [lang, text]);
  const commands = useMemo(() => (isTerminal ? extractCliCommands(text) : []), [isTerminal, text]);

  const label = isTerminal ? "終端機" : LANG_LABEL[lang] ?? lang.toUpperCase();
  const Icon = isTerminal ? TerminalSquare : lang ? FileCode2 : FileCode2;

  const handleCopy = async () => {
    if (!containerRef.current) return;
    const t = containerRef.current.innerText;
    try {
      await navigator.clipboard.writeText(t);
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
      className={`cb-root my-4 rounded-xl border overflow-hidden shadow-lg ${
        isTerminal ? "cb-terminal border-emerald-500/25 bg-[#0c1512]" : "cb-file border-white/10 bg-[#1b1d23]"
      }`}
      style={{ maxWidth: "100%" }}
    >
      {/* Header：macOS 紅黃綠燈 + 標籤 + 複製 */}
      <div
        className={`cb-head flex items-center justify-between px-3.5 py-2 border-b ${
          isTerminal ? "bg-[#08100d] border-emerald-500/20" : "bg-[#15171c] border-white/10"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 shrink-0" aria-hidden>
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </span>
          <span
            className={`cb-label flex items-center gap-1.5 text-xs font-mono font-medium truncate ${
              isTerminal ? "text-emerald-300" : "text-sky-300"
            }`}
          >
            <Icon size={13} className="shrink-0" />
            {label}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="cb-copy flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-white/10 transition text-fg-muted shrink-0"
          aria-label="複製程式碼"
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

      {/* 程式碼本體 */}
      <div
        ref={containerRef}
        className="overflow-x-auto"
        style={{ maxWidth: "100%", WebkitOverflowScrolling: "touch" }}
      >
        <pre
          className={`px-4 py-3.5 text-sm leading-relaxed ${className ?? ""}`}
          style={{
            margin: 0,
            whiteSpace: "pre",
            wordWrap: "normal",
            display: "inline-block",
            minWidth: "100%",
            boxSizing: "border-box",
            background: "transparent",
          }}
        >
          {children}
        </pre>
      </div>

      {/* 指令說明小抄：偵測到終端機指令時自動出現 */}
      {commands.length > 0 && (
        <div className={`border-t ${isTerminal ? "border-emerald-500/20" : "border-white/10"}`}>
          <button
            onClick={() => setShowGlossary((s) => !s)}
            className="cb-gloss w-full flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-emerald-300/80 hover:text-emerald-200 hover:bg-white/[0.03] transition"
          >
            <BookOpen size={12} />
            指令說明（{commands.length}）
            <span className="ml-auto text-emerald-300/50">{showGlossary ? "▲ 收起" : "▼ 看這些指令是什麼"}</span>
          </button>
          {showGlossary && (
            <ul className="px-3.5 pb-3 pt-0.5 space-y-1.5 text-xs">
              {commands.map((cmd) => (
                <li key={cmd} className="flex gap-2 leading-relaxed">
                  <code className="cb-gloss-code shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono h-fit">
                    {cmd}
                  </code>
                  <span className="text-fg-muted">{CLI_GLOSSARY[cmd]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
