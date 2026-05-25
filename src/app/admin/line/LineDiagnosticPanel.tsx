"use client";

import { useState } from "react";
import { Stethoscope, Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type HealthCheck = { step: string; status: "ok" | "warn" | "fail"; detail: string };

export function LineDiagnosticPanel() {
  const toast = useToast();
  const [health, setHealth] = useState<{ verdict: string; summary: any; checks: HealthCheck[] } | null>(null);
  const [pushing, setPushing] = useState(false);
  const [checking, setChecking] = useState(false);

  const runHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/line/ai-health");
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || `HTTP ${res.status}`);
        return;
      }
      setHealth(j);
    } catch (e: any) {
      toast.error(`網路錯誤：${e?.message ?? "unknown"}`);
    } finally {
      setChecking(false);
    }
  };

  const push = async (bot: "admin" | "user") => {
    setPushing(true);
    try {
      const res = await fetch("/api/admin/line/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot,
          text: `🩺 ${bot === "admin" ? "ADMIN" : "USER"} bot 測試 push @ ${new Date().toLocaleString("zh-TW")}`,
        }),
      });
      const j = await res.json();
      if (j.ok) {
        toast.success(`✅ ${bot} bot push 成功、LINE 應該已收到`);
      } else {
        toast.error(`❌ ${bot} bot 失敗：${j.error ?? j.hint ?? "unknown"} (step=${j.step})`);
      }
    } catch (e: any) {
      toast.error(`網路錯誤：${e?.message ?? "unknown"}`);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
      <div className="font-bold text-sm flex items-center gap-1.5">
        <Stethoscope size={14} className="text-cyan-300" />
        LINE AI 診斷工具
      </div>
      <p className="text-xs text-fg-muted">
        webhook 綠但 LINE 不回覆？先按「健檢」看哪段斷、再按「推測試訊息」確認 channel token 沒問題。
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={runHealth}
          disabled={checking}
          className="px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs inline-flex items-center gap-1 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {checking ? <Loader2 size={11} className="animate-spin" /> : <Stethoscope size={11} />}
          🩺 跑健檢 (檢 env + DB + 解密)
        </button>
        <button
          onClick={() => push("admin")}
          disabled={pushing}
          className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs inline-flex items-center gap-1 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {pushing ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          📤 推測試到我的 admin LINE
        </button>
        <button
          onClick={() => push("user")}
          disabled={pushing}
          className="px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs inline-flex items-center gap-1 hover:bg-purple-500/25 disabled:opacity-50"
        >
          {pushing ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          📤 推測試到我的 user LINE
        </button>
      </div>

      {health && (
        <div className="space-y-1.5 mt-2">
          <div
            className={`text-sm font-bold p-2 rounded-lg ${
              health.summary.fail === 0
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-red-500/10 text-red-300"
            }`}
          >
            {health.verdict}
            <div className="text-[10px] font-normal mt-1 text-fg-muted">
              ✅ {health.summary.pass} · ⚠️ {health.summary.warn} · ❌ {health.summary.fail}
            </div>
          </div>
          <div className="space-y-1">
            {health.checks.map((c, i) => (
              <div
                key={i}
                className={`text-[11px] p-2 rounded border ${
                  c.status === "ok"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : c.status === "warn"
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-red-500/40 bg-red-500/10"
                }`}
              >
                <div className="font-bold">
                  {c.status === "ok" ? "✅" : c.status === "warn" ? "⚠️" : "❌"} {c.step}
                </div>
                <div className="text-fg-muted mt-0.5 break-all">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
