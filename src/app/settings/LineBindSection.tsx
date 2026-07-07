"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Copy, Check, Unlink, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

// user bot @basicId、給 /settings 加好友 deeplink 用
const USER_BOT_BASIC_ID = process.env.NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID || "";

export function LineBindSection({
  initialBound,
  initialNotifyEnabled,
}: {
  initialBound: boolean;
  initialNotifyEnabled: boolean;
}) {
  const t = useTranslations("settings");
  const toast = useToast();
  const confirm = useConfirm();
  const [bound, setBound] = useState(initialBound);
  const [notifyEnabled, setNotifyEnabled] = useState(initialNotifyEnabled);
  const [code, setCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/me/line/bind-code", {
      credentials: "include", method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || t("generateFailed"));
      setCode(j.code);
    } catch (e: any) {
      toast.error(e?.message || t("failed"));
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`/bind ${code}`);
      setCopied(true);
      toast.success(t("codeCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailedManual", { code }));
    }
  };

  const unbind = async () => {
    const ok = await confirm({
      title: t("lineUnbindTitle"),
      description: t("lineUnbindDesc"),
      confirmLabel: t("unbind"),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/me/line/unbind", {
      credentials: "include", method: "POST" });
      if (!res.ok) throw new Error(t("unbindFailed"));
      setBound(false);
      setCode("");
      toast.success(t("unbound"));
    } catch (e: any) {
      toast.error(e?.message || t("failed"));
    } finally {
      setBusy(false);
    }
  };

  const toggleNotify = async (next: boolean) => {
    setNotifyEnabled(next);
    // 借 profiles 表的 supabase update（前面 SettingsForm 已用 supabase client）
    const { createSupabaseBrowser } = await import("@/lib/supabase-browser");
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ line_notify_enabled: next }).eq("id", user.id);
  };

  const lineAddUrl = USER_BOT_BASIC_ID ? `https://line.me/R/ti/p/${USER_BOT_BASIC_ID}` : "";

  return (
    <section className="bg-bg-card border border-border rounded-xl p-6">
      <h2 className="font-bold mb-1 flex items-center gap-2">
        <MessageCircle size={18} className="text-green-400" /> {t("linePersonalNotify")}
      </h2>
      <p className="text-xs text-fg-muted mb-4">
        {t("lineBindDesc")}
      </p>

      {bound ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Check size={16} className="text-green-400" />
            <span className="font-medium">{t("bound")}</span>
          </div>

          {/* notify toggle */}
          <label className="flex items-start gap-3 cursor-pointer">
            <span className="relative inline-flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={(e) => toggleNotify(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-9 h-5 bg-bg-elevated rounded-full peer-checked:bg-accent transition" />
              <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow" />
            </span>
            <span className="flex-1 text-sm">
              <span className="font-medium">{t("receiveLineNotify")}</span>
              <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                {t("lineNotifyToggleHelp")}
              </p>
            </span>
          </label>

          <button
            onClick={unbind}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Unlink size={12} />
            {t("unbindButton")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <ol className="text-sm space-y-2 list-decimal list-inside text-fg-muted">
            <li>
              <a
                href={lineAddUrl || "https://line.me/"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium"
              >
                {t("addBotFriend")}
              </a>
              {!lineAddUrl && <span className="text-[10px] ml-1">{t("botBasicIdNotSet")}</span>}
            </li>
            <li>{t("lineStep2")}</li>
            <li>{t("lineStep3Prefix")}<code className="font-mono text-fg">/bind 123456</code>{t("lineStep3Suffix")}</li>
          </ol>

          {!code ? (
            <button
              onClick={generate}
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-accent text-black font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              {generating && <Loader2 size={14} className="animate-spin" />}
              {t("getSixDigitCode")}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-bg-elevated">
                <code className="font-mono text-2xl font-bold tracking-widest flex-1 text-center text-accent">
                  {code}
                </code>
                <button
                  onClick={copyCode}
                  className="px-3 py-2 rounded-lg bg-bg border border-border text-xs font-medium inline-flex items-center gap-1"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {t("copy")}
                </button>
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed">
                {t("codeHelpPrefix")}<code>/bind {code}</code>{t("codeHelpSuffix")}<br />
                {t("codeHelpLine2")}
              </p>
              <button
                onClick={generate}
                disabled={generating}
                className="text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1"
              >
                {t("regenerate")}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
