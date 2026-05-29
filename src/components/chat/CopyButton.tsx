"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * 通用複製按鈕
 * 林董：訊息 + code block 都要有複製
 */
export function CopyButton({
  text,
  label,
  size = 12,
  className = "",
}: {
  text: string;
  label?: string;
  size?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 老瀏覽器 fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
      document.body.removeChild(ta);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "已複製" : "複製"}
      className={`inline-flex items-center gap-1 text-xs text-fg-muted hover:text-accent transition ${className}`}
    >
      {copied ? <Check size={size} className="text-green-400" /> : <Copy size={size} />}
      {label && <span>{copied ? "已複製" : label}</span>}
    </button>
  );
}
