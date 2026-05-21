"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

export function SubscribeForm({ userSlug }: { userSlug: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const submit = async () => {
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    setErrMsg("");
    const res = await fetch(`/api/blog/${userSlug}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name.trim() || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus("error");
      setErrMsg(json.error === "invalid_email" ? "email 格式不對" : "訂閱失敗、請稍後再試");
      return;
    }
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 p-5 text-center">
        <Check size={24} className="mx-auto mb-2 text-[var(--color-accent)]" />
        <p className="font-semibold">訂閱成功！</p>
        <p className="text-sm text-[var(--color-fg-muted)]">有新文章會通知你</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <h3 className="font-bold flex items-center gap-2 mb-1">
        <Mail size={18} className="text-[var(--color-accent)]" /> 訂閱這個部落格
      </h3>
      <p className="text-sm text-[var(--color-fg-muted)] mb-3">
        有新文章第一時間收到通知
      </p>
      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的名字（選填）"
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="你的 email"
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={submit}
            disabled={!email.trim() || status === "sending"}
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-black text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
          >
            {status === "sending" ? <Loader2 size={14} className="animate-spin" /> : null}
            訂閱
          </button>
        </div>
      </div>
      {status === "error" && (
        <p className="text-xs text-red-400 mt-2">{errMsg}</p>
      )}
    </div>
  );
}
