"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function SubscribeForm({ userSlug }: { userSlug: string }) {
  const t = useTranslations("blogs");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const submit = async () => {
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    setErrMsg("");
    const res = await fetch(`/api/blog/${userSlug}/subscribe`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name.trim() || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus("error");
      setErrMsg(json.error === "invalid_email" ? t("invalidEmail") : t("subscribeFailed"));
      return;
    }
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/10 p-5 text-center">
        <Check size={24} className="mx-auto mb-2 text-accent" />
        <p className="font-semibold">{t("subscribeSuccess")}</p>
        <p className="text-sm text-fg-muted">{t("subscribeSuccessDesc")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <h3 className="font-bold flex items-center gap-2 mb-1">
        <Mail size={18} className="text-accent" /> {t("subscribeHeading")}
      </h3>
      <p className="text-sm text-fg-muted mb-3">
        {t("subscribeSubheading")}
      </p>
      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={t("emailPlaceholder")}
            className="flex-1 bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={!email.trim() || status === "sending"}
            className="px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
          >
            {status === "sending" ? <Loader2 size={14} className="animate-spin" /> : null}
            {t("subscribe")}
          </button>
        </div>
      </div>
      {status === "error" && (
        <p className="text-xs text-red-400 mt-2">{errMsg}</p>
      )}
    </div>
  );
}
