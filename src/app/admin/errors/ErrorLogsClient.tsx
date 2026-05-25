"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type ErrorLog = {
  id: string;
  occurred_at: string;
  level: string;
  source: string;
  message: string;
  status_code: number | null;
  request_path: string | null;
  user_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
};

const LEVEL_COLOR: Record<string, string> = {
  debug: "bg-gray-500/15 text-gray-400",
  info: "bg-blue-500/15 text-blue-400",
  warn: "bg-yellow-500/15 text-yellow-400",
  error: "bg-red-500/15 text-red-400",
  fatal: "bg-red-500/15 text-red-300",
};

export function ErrorLogsClient({
  initial,
  total,
  page,
  pageSize,
  filters,
}: {
  initial: ErrorLog[];
  total: number;
  page: number;
  pageSize: number;
  filters: { level: string; source: string; resolved: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [logs, setLogs] = useState(initial);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [level, setLevel] = useState(filters.level);
  const [source, setSource] = useState(filters.source);
  const [resolved, setResolved] = useState(filters.resolved);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (source.trim()) params.set("source", source.trim());
    if (resolved !== "open") params.set("resolved", resolved);
    router.push(`?${params.toString()}` as any);
  };

  const toggleExpand = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resolveLog = async (id: string) => {
    const note = window.prompt("解決說明（選填）：");
    if (note === null) return; // 取消

    // optimistic
    const before = logs;
    setLogs((list) => list.map((l) => (l.id === id ? { ...l, resolved: true, resolved_at: new Date().toISOString() } : l)));

    try {
      const res = await fetch(`/api/admin/errors/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("已標記為解決");
    } catch {
      setLogs(before);
      toast.error("解決失敗");
    }
  };

  const bulkClear = async () => {
    const ok = await confirm({
      title: "清除所有「已解決」紀錄？",
      description: "永久刪除、無法復原。",
      confirmLabel: "清除",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch("/api/admin/errors/cleanup", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(`已刪除 ${j.deleted ?? "?"} 筆`);
      router.refresh();
    } else {
      toast.error("清除失敗");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {/* Filters */}
      <div className="rounded-xl bg-bg-card border border-border p-3 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[10px] text-fg-muted block mb-1">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="bg-bg border border-border rounded-lg px-2 py-1 text-sm"
          >
            <option value="">全部</option>
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
            <option value="fatal">fatal</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] text-fg-muted block mb-1">Source 包含</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="例：api:/api/ai/"
            className="w-full bg-bg border border-border rounded-lg px-2 py-1 text-sm font-mono"
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        <div>
          <label className="text-[10px] text-fg-muted block mb-1">狀態</label>
          <select
            value={resolved}
            onChange={(e) => setResolved(e.target.value)}
            className="bg-bg border border-border rounded-lg px-2 py-1 text-sm"
          >
            <option value="open">未解決</option>
            <option value="resolved">已解決</option>
            <option value="all">全部</option>
          </select>
        </div>
        <button
          onClick={applyFilters}
          className="px-4 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold flex items-center gap-1"
        >
          <Filter size={12} /> 套用
        </button>
        <button
          onClick={bulkClear}
          className="ml-auto px-3 py-1.5 rounded-lg border border-red-400/40 text-red-400 text-sm hover:bg-red-500/10"
        >
          清除已解決
        </button>
      </div>

      {/* 列表 */}
      <div className="rounded-xl bg-bg-card border border-border overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm">
            🎉 沒有符合條件的錯誤紀錄
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const isOpen = expanded.has(log.id);
              return (
                <div key={log.id} className={`p-3 ${log.resolved ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="text-fg-muted hover:text-fg p-0.5 mt-1"
                      aria-label={isOpen ? "收合" : "展開"}
                    >
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${LEVEL_COLOR[log.level] ?? LEVEL_COLOR.error}`}
                    >
                      {log.level}
                    </span>
                    {log.status_code && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted font-mono">
                        {log.status_code}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" title={log.message}>
                        {log.message}
                      </div>
                      <div className="text-[10px] text-fg-muted flex items-center gap-2 mt-0.5">
                        <span className="font-mono truncate">{log.source}</span>
                        <span>·</span>
                        <span>{new Date(log.occurred_at).toLocaleString("zh-TW", { hour12: false })}</span>
                      </div>
                    </div>
                    {!log.resolved ? (
                      <button
                        onClick={() => resolveLog(log.id)}
                        className="text-xs px-2 py-1 rounded-lg border border-border hover:text-accent hover:border-accent flex items-center gap-1"
                      >
                        <Check size={12} /> 解決
                      </button>
                    ) : (
                      <span className="text-[10px] text-fg-muted flex items-center gap-0.5">
                        <Check size={11} className="text-accent" /> 已解決
                      </span>
                    )}
                  </div>
                  {isOpen && (
                    <div className="mt-2 ml-6 p-3 bg-bg rounded-lg text-xs space-y-1.5">
                      {log.request_path && (
                        <div>
                          <span className="text-fg-muted">path:</span>{" "}
                          <span className="font-mono">{log.request_path}</span>
                        </div>
                      )}
                      {log.user_id && (
                        <div>
                          <span className="text-fg-muted">user_id:</span>{" "}
                          <span className="font-mono">{log.user_id}</span>
                        </div>
                      )}
                      <div className="font-mono text-fg-muted">id: {log.id}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-fg-muted">
            第 {page} / {totalPages} 頁、共 {total.toLocaleString()} 筆
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?${new URLSearchParams({ ...filters, page: String(page - 1) }).toString()}`}
                className="px-3 py-1 rounded-lg border border-border hover:bg-bg-elevated"
              >
                上一頁
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?${new URLSearchParams({ ...filters, page: String(page + 1) }).toString()}`}
                className="px-3 py-1 rounded-lg border border-border hover:bg-bg-elevated"
              >
                下一頁
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
