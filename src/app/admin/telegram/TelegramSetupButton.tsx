"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type SetupResult = {
  webhook_url?: string;
  has_secret?: boolean;
  commands_count?: number;
  next_steps?: string[];
  error?: string;
};

export function TelegramSetupButton() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/telegram/setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const j = (await res.json()) as SetupResult;
      setResult(j);
      if (!res.ok || j.error) throw new Error(j.error || "設定失敗");
      toast.success("Telegram webhook + 命令選單已設定");
    } catch (e: any) {
      toast.error(e?.message || "設定失敗");
    } finally {
      setBusy(false);
    }
  };

  const ok = result && !result.error;

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={busy}
        className="text-sm px-4 py-2 rounded-full bg-accent text-black font-bold hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {busy ? "設定中…" : "設定 / 重設 Telegram Webhook"}
      </button>

      {result && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"
          }`}
        >
          <div className="flex items-center gap-2 font-bold mb-2">
            {ok ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
            {ok ? "設定完成" : "設定失敗"}
          </div>
          {result.error ? (
            <p className="text-red-400">{result.error}</p>
          ) : (
            <div className="space-y-1.5 text-fg-muted">
              <div>Webhook：<code className="text-fg">{result.webhook_url}</code></div>
              <div>
                Secret token：
                {result.has_secret ? (
                  <span className="text-emerald-400">已帶上（安全）</span>
                ) : (
                  <span className="text-amber-400">⚠️ 未設 TELEGRAM_WEBHOOK_SECRET — webhook 會被 fail-closed 擋下</span>
                )}
              </div>
              <div>已註冊命令數：{result.commands_count}</div>
              {result.next_steps && result.next_steps.length > 0 && (
                <ul className="mt-2 list-disc list-inside space-y-0.5">
                  {result.next_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
