"use client";

import Link from "next/link";
import { Sparkles, FileText } from "lucide-react";

const STORAGE_KEY = "resume_cta_dismissed_at";
const DISMISS_TTL = 30 * 86400_000;

import { useEffect, useState } from "react";

export function ResumeCTA() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      const at = localStorage.getItem(STORAGE_KEY);
      if (at && Date.now() - Number(at) < DISMISS_TTL) setShow(false);
    } catch {}
  }, []);

  function dismiss(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setShow(false);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
  }

  if (!show) return null;

  return (
    <Link
      href="/me/resume"
      className="relative bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-orange-500/15 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3 hover:border-purple-500/60 transition group"
    >
      <button onClick={dismiss} className="absolute top-2 right-2 text-fg-muted hover:text-fg text-[10px]" title="30 天內不再顯示">×</button>
      <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
        <FileText size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold flex items-center gap-1.5">
          🪪 雪鑰幫你寫履歷
          <Sparkles size={14} className="text-yellow-400 group-hover:rotate-12 transition" />
        </h3>
        <p className="text-xs text-fg-muted leading-snug">
          看你 lesson / LeetCode / 作品集、自動生成 markdown 履歷 + 印 PDF
        </p>
      </div>
      <span className="text-sm text-purple-500 dark:text-purple-300 font-semibold shrink-0">開始 →</span>
    </Link>
  );
}
