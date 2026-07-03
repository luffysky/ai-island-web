"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

/**
 * 通用分享按鈕：原生分享（手機）+ LINE / X / Facebook / 複製連結（桌機 modal）。
 * 深色主題、lucide 圖示。用於作品、證書等公開頁。
 */
export function ShareButton({
  url,
  title,
  text,
  label = "分享",
  className,
}: {
  url: string;
  title: string;
  text?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const enc = encodeURIComponent(url);
  const encText = encodeURIComponent(text || title);
  const lineShare = `https://social-plugins.line.me/lineit/share?url=${enc}`;
  const xShare = `https://twitter.com/intent/tweet?text=${encText}&url=${enc}`;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${enc}`;

  let host = url;
  try { host = new URL(url).hostname; } catch {}

  const onClick = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: text || title, url });
        return;
      } catch { /* 使用者取消 → 落回 modal */ }
    }
    setOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <>
      <button
        onClick={onClick}
        className={
          className ??
          "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bg-card border border-border text-sm text-fg-muted hover:text-fg hover:border-accent/50 transition"
        }
      >
        <Share2 size={15} />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-br from-accent/10 via-accent-2/5 to-bg-card border-b border-border">
              <h3 className="text-sm font-semibold leading-snug line-clamp-2">{title}</h3>
              {text && <p className="mt-1 text-xs text-fg-muted line-clamp-2">{text}</p>}
              <p className="mt-2 text-[10px] text-fg-muted/60">{host}</p>
            </div>

            <div className="p-5 space-y-3">
              <h4 className="text-sm font-medium text-fg-muted mb-1">分享到</h4>
              <a href={lineShare} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#06C755]/15 border border-[#06C755]/25 text-[#06C755] text-sm font-medium hover:bg-[#06C755]/25 transition-colors">
                <span className="text-lg">💬</span><span>LINE</span>
              </a>
              <a href={xShare} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 border border-border text-sm font-medium hover:border-accent/40 transition-colors">
                <span className="text-lg">𝕏</span><span>X (Twitter)</span>
              </a>
              <a href={fbShare} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#1877F2]/15 border border-[#1877F2]/25 text-[#4293ff] text-sm font-medium hover:bg-[#1877F2]/25 transition-colors">
                <span className="text-lg">📘</span><span>Facebook</span>
              </a>
              <button onClick={copyLink}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-sm hover:border-accent/40 transition-colors">
                {copied ? <Check size={18} className="text-emerald-400" /> : <Link2 size={18} />}
                <span>{copied ? "已複製連結！" : "複製連結"}</span>
              </button>
              <button onClick={() => setOpen(false)}
                className="w-full text-xs text-fg-muted py-2 hover:text-fg transition-colors">
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
