"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
        <div className="text-5xl mb-3">😵</div>
        <h1 className="text-xl font-bold mb-2 inline-flex items-center gap-1.5">
          <AlertTriangle size={20} className="text-orange-400" />
          頁面壞掉了
        </h1>
        <p className="text-sm text-fg-muted leading-relaxed">
          這頁出了點意外、不是你的錯。點重試看能不能修好、不行就回首頁。
        </p>
        {error.digest && (
          <p className="mt-3 text-[10px] text-fg-muted/70 font-mono">
            錯誤 ID：{error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center justify-center gap-1.5 hover:scale-105 transition"
          >
            <RotateCcw size={14} /> 重試
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-full border border-border text-sm inline-flex items-center justify-center gap-1.5 hover:border-accent transition"
          >
            <Home size={14} /> 回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
