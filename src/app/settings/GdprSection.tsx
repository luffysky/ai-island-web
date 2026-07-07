"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, AlertTriangle, RotateCcw } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/**
 * GDPR 操作區塊 — 嵌進 /settings 頁底部。
 *  - 匯出個資 JSON
 *  - 排程刪除（軟刪、7 天內可救回）
 *  - 取消刪除（若已軟刪）
 */
export function GdprSection({ initialDeletedAt }: { initialDeletedAt: string | null }) {
  const t = useTranslations("settings");
  const toast = useToast();
  const confirm = useConfirm();
  const [deletedAt, setDeletedAt] = useState<string | null>(initialDeletedAt);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/user/gdpr/export");
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-island-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("exportedData"));
    } catch (e: any) {
      toast.error(t("exportFailed", { msg: e?.message || t("tryLater") }));
    } finally {
      setExporting(false);
    }
  };

  const requestDelete = async () => {
    const ok1 = await confirm({
      title: t("gdprDeleteConfirm1Title"),
      description: t("gdprDeleteConfirm1Desc"),
      confirmLabel: t("nextStep"),
      destructive: true,
    });
    if (!ok1) return;
    const ok2 = await confirm({
      title: t("finalConfirmTitle"),
      description: t("gdprDeleteConfirm2Desc"),
      confirmLabel: t("scheduleDelete"),
      destructive: true,
    });
    if (!ok2) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/user/gdpr/delete", {
      credentials: "include", method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || t("deleteFailed"));
      toast.success(t("markedForDeletion"));
      setTimeout(async () => {
        const supabase = createSupabaseBrowser();
        await supabase.auth.signOut();
        window.location.href = "/";
      }, 3000);
    } catch (e: any) {
      toast.error(t("deleteFailedMsg", { msg: e?.message || "" }));
      setDeleting(false);
    }
  };

  const cancelDelete = async () => {
    const ok = await confirm({
      title: t("cancelDeleteTitle"),
      description: t("cancelDeleteDesc"),
      confirmLabel: t("cancelDeleteConfirm"),
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/user/gdpr/cancel", {
      credentials: "include", method: "POST" });
      if (!res.ok) throw new Error();
      setDeletedAt(null);
      toast.success(t("cancelDeleteSuccess"));
    } catch {
      toast.error(t("cancelDeleteFailed"));
    }
  };

  return (
    <section className="mt-12 space-y-4">
      {/* 軟刪警告 banner */}
      {deletedAt && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-400 mb-1">{t("accountScheduledForDeletion")}</div>
              <p className="text-sm text-fg-muted">
                {t("markedTime", { time: new Date(deletedAt).toLocaleString("zh-TW") })}
                <br />
                {t("gdprDeleteBannerNote", { date: new Date(new Date(deletedAt).getTime() + 7 * 86400_000).toLocaleDateString("zh-TW") })}
              </p>
              <button
                onClick={cancelDelete}
                className="mt-3 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold flex items-center gap-1"
              >
                <RotateCcw size={13} /> {t("cancelDeleteRestore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 匯出個資 */}
      <div className="rounded-xl bg-bg-card border border-border p-5">
        <h2 className="font-bold text-base mb-1 flex items-center gap-2">
          <Download size={18} /> {t("exportPersonalData")}
        </h2>
        <p className="text-sm text-fg-muted mb-3">
          {t("exportDataDesc")}
        </p>
        <button
          onClick={exportData}
          disabled={exporting}
          className="px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          <Download size={14} />
          {exporting ? t("exporting") : t("downloadJson")}
        </button>
      </div>

      {/* 刪除帳號 */}
      {!deletedAt && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-5">
          <h2 className="font-bold text-base text-red-400 mb-1 flex items-center gap-2">
            <AlertTriangle size={18} /> {t("deleteAccountGdpr")}
          </h2>
          <p className="text-sm text-fg-muted mb-3">
            {t("deleteAccountWarn1")}
            <br />
            {t("deleteAccountWarn2")}
          </p>
          <button
            onClick={requestDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {deleting ? t("processing") : t("scheduleDeleteAccount")}
          </button>
        </div>
      )}
    </section>
  );
}
