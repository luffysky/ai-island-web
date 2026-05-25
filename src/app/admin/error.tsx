"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full rounded-2xl border border-red-500/40 bg-red-500/5 p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-red-400" />
          <h2 className="text-lg font-bold">後台這頁壞掉了</h2>
        </div>
        <p className="text-sm text-fg-muted">
          可能 supabase 連不到、env 變數沒設好、或這頁 query 撞 schema 改動。先試重試、不行看 server log。
        </p>
        <pre className="mt-3 p-3 bg-bg rounded-lg text-[11px] font-mono whitespace-pre-wrap overflow-auto max-h-60 text-red-200">
          {error?.message ?? String(error)}
          {error?.digest ? `\n\nDigest: ${error.digest}` : ""}
        </pre>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1.5"
          >
            <RotateCcw size={13} /> 重試
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-full border border-border text-sm inline-flex items-center gap-1.5 hover:border-accent transition"
          >
            <Home size={13} /> 後台首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
