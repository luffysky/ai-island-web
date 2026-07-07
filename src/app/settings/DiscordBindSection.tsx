"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Unlink, Hash, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Bind = {
  discord_username: string | null;
  discord_avatar: string | null;
  bound_at: string;
  last_role_sync_at: string | null;
};

export function DiscordBindSection({ initialBind }: { initialBind: Bind | null }) {
  const t = useTranslations("settings");
  const toast = useToast();
  const confirm = useConfirm();
  const [bind, setBind] = useState<Bind | null>(initialBind);
  const [busy, setBusy] = useState(false);

  // 從 URL 拿 dc=ok 顯示成功 toast
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const dc = sp.get("dc");
    if (dc === "ok") toast.success(t("discordBindSuccess"));
    else if (dc?.startsWith("error_")) toast.error(t("bindFailed", { msg: dc.slice(6) }));
    if (dc) {
      sp.delete("dc");
      const qs = sp.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  const unbind = async () => {
    const ok = await confirm({
      title: t("discordUnbindTitle"),
      description: t("discordUnbindDesc"),
      confirmLabel: t("unbind"),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/discord/unbind", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(t("unbindFailed"));
      setBind(null);
      toast.success(t("unbound"));
    } catch (e: any) {
      toast.error(e?.message || t("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-bg-card border border-border rounded-xl p-6">
      <h2 className="font-bold mb-1 flex items-center gap-2">
        <Hash size={18} className="text-indigo-400" /> {t("discordBind")}
      </h2>
      <p className="text-xs text-fg-muted mb-4">
        {t("discordBindDescPrefix")}<code>/quote</code> <code>/recommend</code> <code>/vision</code>{t("discordBindDescSuffix")}
      </p>

      {bind ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {bind.discord_avatar && (
              <img
                src={`https://cdn.discordapp.com/avatars/${bind.discord_avatar}/${bind.discord_avatar}.png`}
                alt=""
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-400" />
                <span className="font-medium">{t("discordBound", { name: bind.discord_username ?? "" })}</span>
              </div>
              <div className="text-[10px] text-fg-muted mt-0.5">
                {new Date(bind.bound_at).toLocaleString("zh-TW")}
                {bind.last_role_sync_at && ` · ${t("roleLastSync")}${new Date(bind.last_role_sync_at).toLocaleDateString("zh-TW")}`}
              </div>
            </div>
          </div>
          <button
            onClick={unbind}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1 disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
            {t("unbindButton")}
          </button>
        </div>
      ) : (
        <a
          href="/api/auth/discord/start"
          className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-bold text-sm inline-flex items-center gap-2"
        >
          <Hash size={14} />
          {t("bindDiscord")}
        </a>
      )}
    </section>
  );
}
