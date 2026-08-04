"use client";
// 顯示「需要使用者手勢」的 client-action：new-tab 開頁（點才開、免被瀏覽器擋）、stale 重試、失敗重試。
// 自動類（站內導航、same-tab）不在這裡顯示——它們由 AgentClient 靜默執行。
import { ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";
import { isStale, needsUserGesture, type ClientAction } from "@/lib/agent/client-actions";

interface Props {
  actions: ClientAction[];
  onExecute: (a: ClientAction) => void;
}

export function ClientActionBar({ actions, onExecute }: Props) {
  const now = Date.now();
  const shown = actions.filter((a) =>
    (a.status === "pending" && needsUserGesture(a)) ||
    a.status === "failed" ||
    isStale(a, now),
  );
  if (!shown.length) return null;

  return (
    <div className="mt-3 space-y-2">
      {shown.map((a) => {
        const label = a.type === "open_url" ? a.url : a.path;
        const failed = a.status === "failed";
        const stale = a.status === "acknowledged";
        const Icon = failed ? AlertTriangle : stale ? RefreshCw : ExternalLink;
        const btnText = failed || stale ? "重試" : "開啟";
        const title = failed ? "無法開啟" : stale ? "似乎沒有完成" : "分身想幫你開啟";
        return (
          <div key={a.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              failed ? "border-rose-500/40 bg-rose-500/5" : "border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03]"}`}>
            <Icon className={`w-4 h-4 shrink-0 ${failed ? "text-rose-500" : "text-sky-500"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-black/50 dark:text-white/50">{title}</div>
              <div className="truncate">{label}</div>
              {failed && a.error && <div className="text-xs text-rose-500 truncate">{a.error}</div>}
            </div>
            <button onClick={() => onExecute(a)}
              className="shrink-0 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 text-xs font-medium">
              {btnText}
            </button>
          </div>
        );
      })}
    </div>
  );
}
