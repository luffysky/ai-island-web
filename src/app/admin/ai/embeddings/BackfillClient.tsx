"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  done: number;
  failed?: number;
  total: number;
  error?: string;
  skipped?: string;
};

export function BackfillClient({ lessonNeedBackfill, forumNeedBackfill }: {
  lessonNeedBackfill: number;
  forumNeedBackfill: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");
  const [lastResult, setLastResult] = useState<{ lessons?: Result; forum?: Result } | null>(null);

  async function run(target: "lessons" | "forum" | "all", force = false) {
    if (busy) return;
    setBusy(target);
    setLog(`⏳ 開始 backfill ${target}${force ? "（重算）" : ""}…\n注意：跑全部約 1-3 分鐘、不要關掉頁面。`);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/embeddings/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLog(`❌ 失敗：${data.error}${data.hint ? `\n💡 ${data.hint}` : ""}`);
      } else {
        setLastResult(data.summary);
        const parts: string[] = ["✅ 完成"];
        if (data.summary.lessons) {
          const l = data.summary.lessons;
          parts.push(`📚 lessons：${l.done ?? 0} 成功 / ${l.failed ?? 0} 失敗 / ${l.total ?? 0} 總${l.skipped ? `（${l.skipped}）` : ""}`);
        }
        if (data.summary.forum) {
          const f = data.summary.forum;
          parts.push(`💭 forum：${f.done ?? 0} 成功 / ${f.failed ?? 0} 失敗 / ${f.total ?? 0} 總${f.skipped ? `（${f.skipped}）` : ""}`);
        }
        setLog(parts.join("\n"));
        // 刷新覆蓋率
        router.refresh();
      }
    } catch (e: any) {
      setLog(`❌ 網路錯誤：${e?.message ?? "unknown"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-bg-soft border border-border rounded-xl p-5 space-y-4">
      <div className="font-bold text-fg">⚡ 跑 Backfill</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          disabled={!!busy}
          onClick={() => run("lessons", false)}
          className="px-4 py-3 rounded-lg bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-cyan-300 transition"
        >
          {busy === "lessons" ? "⏳ 跑中…" : `⚡ backfill 缺的 lessons（${lessonNeedBackfill} 個）`}
        </button>
        <button
          disabled={!!busy}
          onClick={() => run("forum", false)}
          className="px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-blue-300 transition"
        >
          {busy === "forum" ? "⏳ 跑中…" : `⚡ backfill 缺的 forum (${forumNeedBackfill} 個)`}
        </button>
        <button
          disabled={!!busy}
          onClick={() => run("all", false)}
          className="px-4 py-3 rounded-lg bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-indigo-300 transition"
        >
          {busy === "all" ? "⏳ 跑中…" : `⚡ backfill 全部缺的（lessons + forum）`}
        </button>
        <button
          disabled={!!busy}
          onClick={() => {
            if (!confirm("確定要重算全部 embedding？這會覆蓋已有的、要花 1-3 分鐘 + 多花一次 token 錢")) return;
            run("all", true);
          }}
          className="px-4 py-3 rounded-lg bg-red-500/15 border border-red-500/40 hover:bg-red-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-red-300 transition"
        >
          ⚠️ 強制重算全部 (force=true)
        </button>
      </div>
      {log && (
        <pre className="text-xs bg-bg p-3 rounded whitespace-pre-wrap text-fg-mid">{log}</pre>
      )}
    </div>
  );
}
