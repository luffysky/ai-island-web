"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function NotesExportButton() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const exportMd = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/me/notes/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-island-notes-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("已匯出筆記");
    } catch {
      toast.error("匯出失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={exportMd}
      disabled={busy}
      className="px-3 py-1.5 rounded-lg border border-border hover:border-accent text-sm flex items-center gap-1 disabled:opacity-50"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      匯出 Markdown
    </button>
  );
}
