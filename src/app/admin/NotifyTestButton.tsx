"use client";
import { useState } from "react";

export function NotifyTestButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  async function test() {
    if (busy) return;
    setBusy(true);
    setResult("⏳ 發測試通知到 LINE + Telegram + Discord…");
    try {
      const res = await fetch("/api/admin/notify/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "all" }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        setResult(`❌ API 沒回 JSON（${res.status}）、可能 Zeabur 還在 build`);
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        setResult(`❌ ${data.error}\n💡 ${data.hint ?? ""}`);
      } else {
        const e = data.env ?? {};
        const status = [
          `LINE admin: ${e.line_admin ? "✓ env 設了" : "✗ env 缺"}`,
          `Telegram: ${e.telegram ? "✓ env 設了" : "✗ env 缺"}`,
          `Discord: ${e.discord ? "✓ env 設了" : "✗ env 缺"}`,
        ].join("\n");
        setResult(`✅ 已觸發 notifyAdmin\n\n${status}\n\n💡 ${data.hint}`);
      }
    } catch (e: any) {
      setResult(`❌ 網路錯誤：${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={test}
        disabled={busy}
        className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 disabled:opacity-40 text-xs font-bold text-purple-900 dark:text-purple-100 transition"
      >
        {busy ? "⏳ 跑中…" : "🧪 測 3 通道通知"}
      </button>
      {result && (
        <pre className="text-xs bg-bg p-2 rounded whitespace-pre-wrap text-fg-mid max-w-md">{result}</pre>
      )}
    </div>
  );
}
