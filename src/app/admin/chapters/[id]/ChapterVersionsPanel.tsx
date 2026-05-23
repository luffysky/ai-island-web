"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, FileText, Loader2 } from "lucide-react";

type Version = {
  id: string;
  version: number;
  saved_at: string;
  byte_size: number;
  note: string | null;
  saved_by_user: { username: string; display_name: string | null } | null;
};

export function ChapterVersionsPanel({
  chapterId,
  onLoadVersion,
}: {
  chapterId: number;
  onLoadVersion: (versionId: string) => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/chapters/${chapterId}/versions`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) setError(j.error);
        else setVersions(j.versions ?? []);
      })
      .catch((e) => !cancelled && setError(e?.message || "失敗"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  return (
    <div className="rounded-xl bg-bg-card border border-border p-3 h-[600px] overflow-y-auto">
      <h3 className="font-bold text-sm mb-2 flex items-center gap-1">
        <History size={14} /> 版本歷史
      </h3>
      {loading ? (
        <div className="text-center py-8 text-xs text-fg-muted">
          <Loader2 size={14} className="animate-spin inline mr-1" /> 載入中
        </div>
      ) : error ? (
        <div className="text-xs text-red-400 p-3 bg-red-500/10 rounded-lg">
          {error}
          <br />
          <span className="text-fg-muted">（migration 可能尚未套用）</span>
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 text-xs text-fg-muted">
          <FileText size={20} className="inline opacity-50 mb-1" />
          <p>還沒有版本紀錄</p>
          <p className="mt-1">儲存一次後會自動建立 v1</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {versions.map((v, i) => (
            <div
              key={v.id}
              className={`rounded-lg p-2 border ${
                i === 0
                  ? "border-accent/40 bg-accent/5"
                  : "border-border bg-bg"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-accent">v{v.version}</span>
                  {i === 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-black font-bold">
                      最新
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onLoadVersion(v.id)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:border-accent hover:text-accent transition flex items-center gap-0.5"
                  title="載入此版本到編輯器"
                >
                  <RotateCcw size={9} /> 載入
                </button>
              </div>
              <div className="text-[10px] text-fg-muted mt-1">
                {new Date(v.saved_at).toLocaleString("zh-TW", { hour12: false })}
              </div>
              <div className="text-[10px] text-fg-muted">
                {v.saved_by_user?.display_name || v.saved_by_user?.username || "—"} · {formatBytes(v.byte_size)}
              </div>
              {v.note && (
                <div className="text-[10px] mt-1 italic text-fg-muted break-words">
                  「{v.note}」
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
