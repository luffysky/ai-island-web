"use client";

import { useEffect, useState } from "react";
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
  const toast = useToast();
  const confirm = useConfirm();
  const [bind, setBind] = useState<Bind | null>(initialBind);
  const [busy, setBusy] = useState(false);

  // 從 URL 拿 dc=ok 顯示成功 toast
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const dc = sp.get("dc");
    if (dc === "ok") toast.success("Discord 綁定成功！雪鑰已 DM 你歡迎訊息");
    else if (dc?.startsWith("error_")) toast.error(`綁定失敗：${dc.slice(6)}`);
    if (dc) {
      sp.delete("dc");
      const qs = sp.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  const unbind = async () => {
    const ok = await confirm({
      title: "解除 Discord 綁定？",
      description: "解除後不再收 DM 推播、VIP role 也會撤掉。隨時可重綁。",
      confirmLabel: "解除",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/discord/unbind", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("解除失敗");
      setBind(null);
      toast.success("已解除");
    } catch (e: any) {
      toast.error(e?.message || "失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-bg-card border border-border rounded-xl p-6">
      <h2 className="font-bold mb-1 flex items-center gap-2">
        <Hash size={18} className="text-indigo-400" /> Discord 綁定
      </h2>
      <p className="text-xs text-fg-muted mb-4">
        綁定後可在 Discord 用 <code>/quote</code> <code>/recommend</code> <code>/vision</code>、訂 Premium 自動拿 VIP role、學習里程碑播報到頻道。
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
                <span className="font-medium">已綁定 @{bind.discord_username}</span>
              </div>
              <div className="text-[10px] text-fg-muted mt-0.5">
                {new Date(bind.bound_at).toLocaleString("zh-TW")}
                {bind.last_role_sync_at && ` · role 上次同步：${new Date(bind.last_role_sync_at).toLocaleDateString("zh-TW")}`}
              </div>
            </div>
          </div>
          <button
            onClick={unbind}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1 disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
            解除綁定
          </button>
        </div>
      ) : (
        <a
          href="/api/auth/discord/start"
          className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-bold text-sm inline-flex items-center gap-2"
        >
          <Hash size={14} />
          綁定 Discord
        </a>
      )}
    </section>
  );
}
