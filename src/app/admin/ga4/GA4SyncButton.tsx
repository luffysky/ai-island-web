"use client";
import { useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export function GA4SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const sync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ga4/sync", {
      credentials: "include", method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setResult(`✓ 已同步 ${data.upserted} 天的數據`);
        setTimeout(() => router.refresh(), 1000);
      } else {
        setResult(`❌ ${data.message ?? data.error}`);
      }
    } catch (e: any) {
      setResult(`❌ ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <>
      <button
        onClick={sync}
        disabled={syncing}
        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg text-sm font-semibold hover:scale-105 transition disabled:opacity-50"
      >
        {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {syncing ? "同步中..." : "立即同步"}
      </button>
      {result && (
        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-bg-elevated rounded">
          {result.startsWith("✓") && <Check size={12} className="text-green-400" />}
          {result}
        </span>
      )}
    </>
  );
}
