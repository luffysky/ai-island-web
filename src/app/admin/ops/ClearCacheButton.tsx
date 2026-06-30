"use client";

import { useState } from "react";
import { Eraser } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const PATHS = [
  { label: "首頁", path: "/" },
  { label: "章節列表", path: "/chapters" },
  { label: "部落格", path: "/blogs" },
  { label: "論壇", path: "/forum" },
  { label: "排行榜", path: "/leaderboard" },
];

export function ClearCacheButton() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const revalidate = async (path: string) => {
    setBusy(path);
    try {
      const res = await fetch(`/api/admin/ops/revalidate?path=${encodeURIComponent(path)}`, {
      credentials: "include", method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`已清 ${path}`);
    } catch {
      toast.error(`清失敗：${path}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PATHS.map((p) => (
        <button
          key={p.path}
          onClick={() => revalidate(p.path)}
          disabled={busy === p.path}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent hover:text-accent disabled:opacity-50 flex items-center gap-1"
        >
          {busy === p.path ? "清中…" : <Eraser className="w-3 h-3" />} {p.label}
          <code className="text-[9px] text-fg-muted ml-1">{p.path}</code>
        </button>
      ))}
    </div>
  );
}
