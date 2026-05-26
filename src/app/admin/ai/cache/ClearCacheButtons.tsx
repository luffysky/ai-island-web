"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Snowflake, Filter } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function ClearCacheButtons() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (
    mode: "all" | "stale" | "low_hit",
    confirmOpts: { title: string; description: string; confirmLabel: string; destructive?: boolean },
  ) => {
    const ok = await confirm(confirmOpts);
    if (!ok) return;
    setBusy(mode);
    try {
      const res = await fetch("/api/admin/ai/cache/clear", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "清除失敗");
      toast.success(`已清掉 ${j.deleted ?? 0} 筆`);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "清除失敗");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => run("low_hit", {
          title: "清掉「從沒命中過」的快取？",
          description: "只刪 hit_count <= 1 的條目、純佔空間沒貢獻、安全。",
          confirmLabel: "清",
        })}
        disabled={!!busy}
        className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent inline-flex items-center gap-1 disabled:opacity-50"
        title="只刪 hit_count <= 1（從沒被命中過、純佔空間）"
      >
        {busy === "low_hit" ? <Loader2 size={12} className="animate-spin" /> : <Filter size={12} />}
        清低命中
      </button>
      <button
        onClick={() => run("stale", {
          title: "清掉 7 天沒命中的快取？",
          description: "刪 last_hit_at 超過 7 天 / 從沒命中的條目、釋放空間。",
          confirmLabel: "清",
        })}
        disabled={!!busy}
        className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent inline-flex items-center gap-1 disabled:opacity-50"
      >
        {busy === "stale" ? <Loader2 size={12} className="animate-spin" /> : <Snowflake size={12} />}
        清 7 天無命中
      </button>
      <button
        onClick={() => run("all", {
          title: "⚠️ 全清快取？",
          description: "全部刪除、下次提問都要重新打 AI（命中率歸零）。確認嗎？",
          confirmLabel: "全清",
          destructive: true,
        })}
        disabled={!!busy}
        className="text-xs px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1 disabled:opacity-50"
      >
        {busy === "all" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        全清
      </button>
    </div>
  );
}
