"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function EmailTestForm({ defaultTo, hasResend }: { defaultTo: string; hasResend: boolean }) {
  const toast = useToast();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState("AI 島 — Resend 測試信");
  const [body, setBody] = useState(
    "Hi 👋\n\n這是一封測試信、用來確認 Resend API key + EMAIL_FROM + DKIM 設定都接得通。\n\n如果你收到、表示後台 email channel 正常。\n\nAI 島",
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; id?: string } | null>(null);

  const send = async () => {
    if (!to.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject, text: body }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setResult({ ok: true, msg: "已送出、檢查收件匣（含垃圾信夾）", id: j.id });
        toast.success("已送出");
      } else {
        setResult({ ok: false, msg: j.error || j.message || "未知錯誤" });
        toast.error("發送失敗");
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message ?? "發送失敗" });
      toast.error("發送失敗");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
      <h2 className="font-bold text-sm flex items-center gap-2">
        <Mail size={14} /> 寄一封測試信
      </h2>

      <label className="block">
        <span className="text-xs text-fg-muted">收件人</span>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="you@example.com"
        />
      </label>

      <label className="block">
        <span className="text-xs text-fg-muted">主旨</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="text-xs text-fg-muted">內容（純文字）</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent resize-y"
        />
      </label>

      <button
        onClick={send}
        disabled={!to.trim() || sending || !hasResend}
        className="w-full px-4 py-2.5 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center justify-center gap-1 disabled:opacity-50"
      >
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
        {hasResend ? "送出測試" : "先設 RESEND_API_KEY"}
      </button>

      {result && (
        <div
          className={`rounded-lg p-3 text-xs ${
            result.ok
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          <div className="font-bold inline-flex items-center gap-1.5">
            {result.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {result.ok ? "成功" : "失敗"}
          </div>
          <div className="mt-1 font-mono break-all text-[11px]">{result.msg}</div>
          {result.id && <div className="mt-1 text-[10px] opacity-70">Resend ID: {result.id}</div>}
        </div>
      )}
    </section>
  );
}
