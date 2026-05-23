"use client";

import { useState } from "react";
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
      toast.success("已匯出個資");
    } catch (e: any) {
      toast.error(`匯出失敗：${e?.message || "請稍後再試"}`);
    } finally {
      setExporting(false);
    }
  };

  const requestDelete = async () => {
    const ok1 = await confirm({
      title: "確定要刪除帳號嗎？",
      description: "依 GDPR Art.17、會先「軟刪」、7 天內可登入取消、之後管理員會手動硬刪所有資料。",
      confirmLabel: "下一步",
      destructive: true,
    });
    if (!ok1) return;
    const ok2 = await confirm({
      title: "最後確認",
      description: "刪除後您將被登出。確定繼續？",
      confirmLabel: "排程刪除",
      destructive: true,
    });
    if (!ok2) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/user/gdpr/delete", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "刪除失敗");
      toast.success("已標記刪除、3 秒後登出");
      setTimeout(async () => {
        const supabase = createSupabaseBrowser();
        await supabase.auth.signOut();
        window.location.href = "/";
      }, 3000);
    } catch (e: any) {
      toast.error(`刪除失敗：${e?.message || ""}`);
      setDeleting(false);
    }
  };

  const cancelDelete = async () => {
    const ok = await confirm({
      title: "取消刪除請求？",
      description: "帳號將恢復正常使用。",
      confirmLabel: "取消刪除",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/user/gdpr/cancel", { method: "POST" });
      if (!res.ok) throw new Error();
      setDeletedAt(null);
      toast.success("已取消刪除、帳號恢復");
    } catch {
      toast.error("取消失敗");
    }
  };

  return (
    <section className="mt-12 space-y-4">
      {/* 軟刪警告 banner */}
      {deletedAt && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-400 mb-1">您的帳號已排程刪除</div>
              <p className="text-sm text-fg-muted">
                標記時間：{new Date(deletedAt).toLocaleString("zh-TW")}
                <br />
                依 GDPR Art.17、管理員將在 7 天後（{new Date(new Date(deletedAt).getTime() + 7 * 86400_000).toLocaleDateString("zh-TW")}）執行永久刪除。
                您可以在此之前隨時取消。
              </p>
              <button
                onClick={cancelDelete}
                className="mt-3 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold flex items-center gap-1"
              >
                <RotateCcw size={13} /> 取消刪除、恢復帳號
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 匯出個資 */}
      <div className="rounded-xl bg-bg-card border border-border p-5">
        <h2 className="font-bold text-base mb-1 flex items-center gap-2">
          <Download size={18} /> 匯出個人資料
        </h2>
        <p className="text-sm text-fg-muted mb-3">
          依 GDPR Art.15 資料可攜權、可隨時下載您的所有資料 JSON
          （profile / 學習進度 / 筆記 / 部落格 / 論壇 / Z-coin / 成就 / 寵物 等）。
        </p>
        <button
          onClick={exportData}
          disabled={exporting}
          className="px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          <Download size={14} />
          {exporting ? "匯出中…" : "下載 JSON"}
        </button>
      </div>

      {/* 刪除帳號 */}
      {!deletedAt && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-5">
          <h2 className="font-bold text-base text-red-400 mb-1 flex items-center gap-2">
            <AlertTriangle size={18} /> 刪除帳號（GDPR Art.17）
          </h2>
          <p className="text-sm text-fg-muted mb-3">
            一旦執行、您的個資會在 7 天後永久移除、無法復原。
            <br />
            7 天內可登入取消、超過 7 天 admin 手動執行硬刪。
          </p>
          <button
            onClick={requestDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {deleting ? "處理中…" : "排程刪除帳號"}
          </button>
        </div>
      )}
    </section>
  );
}
