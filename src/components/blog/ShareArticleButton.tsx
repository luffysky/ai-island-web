"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export function ShareArticleButton({
  title,
  summary,
  author,
  url,
}: {
  title: string;
  summary?: string | null;
  author: string;
  url: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const lineShare = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
    url,
  )}`;

  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = url;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card border border-border text-sm text-fg-muted hover:text-fg hover:border-accent/50 transition"
      >
        <Link2 size={14} />
        分享文章
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
            <div className="p-6 bg-gradient-to-br from-accent/8 via-accent-2/5 to-bg-card border-b border-border">
              <div className="bg-bg rounded-2xl p-5 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-sm">
                    ✍️
                  </div>
                  <span className="text-xs text-fg-muted">
                    {author}
                  </span>
                </div>
                <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                  {title}
                </h3>
                {summary && (
                  <p className="text-xs text-fg-muted leading-relaxed line-clamp-3">
                    {summary}
                  </p>
                )}
                <p className="text-[10px] text-fg-muted/60">{host}</p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <h4 className="text-sm font-medium text-fg-muted mb-1">
                分享到
              </h4>
              <a
                href={lineShare}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#06C755]/15 border border-[#06C755]/25 text-[#06C755] text-sm font-medium hover:bg-[#06C755]/25 transition-colors"
              >
                <span className="text-xl">💬</span>
                <span>分享到 LINE</span>
              </a>
              <button
                onClick={copyLink}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-sm hover:border-accent/40 transition-colors"
              >
                {copied ? <Check size={18} /> : <Link2 size={18} />}
                <span>{copied ? "已複製連結！" : "複製連結"}</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-full text-xs text-fg-muted py-2 hover:text-fg transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
