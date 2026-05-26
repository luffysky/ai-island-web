"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  id: string;
  title: string;
  status: "dry_run" | "applied" | "failed";
  old?: string;
  new?: string;
  error?: string;
};

export function RewriteClient({ targetChapters }: { targetChapters: number[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);

  async function run(mode: "sample" | "apply") {
    if (busy) return;
    setBusy(mode);
    setLog(mode === "sample"
      ? "🔍 跑 dry-run sample（3 個 lesson）..."
      : "✍️ 開始 apply、會寫進 DB、約 2-3 分鐘…別關頁面");
    setResults([]);
    try {
      const res = await fetch("/api/admin/rewrite-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_ids: targetChapters,
          dry_run: mode === "sample",
          limit: mode === "sample" ? 3 : 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLog(`❌ 失敗：${data.error}${data.hint ? `\n💡 ${data.hint}` : ""}`);
      } else {
        setLog(`✅ 完成：${data.done} 成功 / ${data.failed} 失敗 / ${data.total_targets} 總${data.dry_run ? "（dry-run、未寫 DB）" : "（已寫 DB）"}`);
        setResults(data.results ?? []);
        if (!data.dry_run) router.refresh();
      }
    } catch (e: any) {
      setLog(`❌ 網路錯誤：${e?.message ?? "unknown"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-bg-soft border border-border rounded-xl p-5 space-y-4">
      <div className="font-bold text-fg">✍️ 跑改寫</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          disabled={!!busy}
          onClick={() => run("sample")}
          className="px-4 py-3 rounded-lg bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-cyan-900 dark:text-cyan-100 transition"
        >
          {busy === "sample" ? "⏳ 跑中…" : "🔍 dry-run sample（3 個）"}
        </button>
        <button
          disabled={!!busy}
          onClick={() => {
            if (!confirm("確定 apply？會寫進 lessons.analogy 欄位、3 章全部短 analogy 都會被改")) return;
            run("apply");
          }}
          className="px-4 py-3 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40 hover:bg-fuchsia-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-fuchsia-900 dark:text-fuchsia-100 transition"
        >
          {busy === "apply" ? "⏳ 跑中…" : "✍️ apply：跑 3 章全部"}
        </button>
      </div>
      {log && <pre className="text-xs bg-bg p-3 rounded whitespace-pre-wrap text-fg-mid">{log}</pre>}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-bold text-fg">改寫結果 ({results.length})</div>
          <div className="max-h-[600px] overflow-y-auto space-y-3">
            {results.map((r) => (
              <div key={r.id} className={`border rounded-lg p-3 text-xs ${r.status === "failed" ? "bg-red-500/10 border-red-500/30" : r.status === "applied" ? "bg-green-500/10 border-green-500/30" : "bg-cyan-500/10 border-cyan-500/30"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold">
                    <span className="font-mono text-accent">{r.id}</span> · {r.title}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${r.status === "failed" ? "bg-red-500/30" : r.status === "applied" ? "bg-green-500/30" : "bg-cyan-500/30"}`}>
                    {r.status}
                  </span>
                </div>
                {r.error && <div className="text-red-400">❌ {r.error}</div>}
                {r.old && (
                  <div className="mb-2">
                    <div className="text-fg-dim mb-1">舊（{r.old.length} 字）</div>
                    <div className="text-fg-mid italic">「{r.old}」</div>
                  </div>
                )}
                {r.new && (
                  <div>
                    <div className="text-fg-dim mb-1">新（{r.new.length} 字）</div>
                    <div className="text-fg">「{r.new}」</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
