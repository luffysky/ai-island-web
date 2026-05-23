"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, Pause, Square, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";

type Experiment = {
  id: string;
  key: string;
  description: string | null;
  status: string;
  variants: Array<{ key: string; weight: number }>;
  goal_event: string | null;
  started_at: string | null;
  created_at: string;
};

type Stats = {
  total: number;
  byVariant: Record<string, number>;
  conversions: Record<string, number>;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-400",
  running: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-yellow-500/15 text-yellow-400",
  completed: "bg-blue-500/15 text-blue-400",
};

export function AbExperimentsClient({ initial, stats }: { initial: Experiment[]; stats: Record<string, Stats> }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [exps, setExps] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [variantsRaw, setVariantsRaw] = useState("control:50,B:50");

  const parseVariants = (raw: string) => {
    return raw.split(",").map((p) => {
      const [key, w] = p.split(":").map((s) => s.trim());
      const weight = parseInt(w || "50", 10);
      return { key, weight };
    }).filter((v) => v.key && Number.isFinite(v.weight));
  };

  const create = async () => {
    if (!newKey.trim()) return;
    const variants = parseVariants(variantsRaw);
    if (variants.length < 2) {
      toast.warning("至少 2 個 variant");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/ab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), description: newDesc.trim() || null, variants }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success("已建立實驗");
      setNewKey("");
      setNewDesc("");
      setVariantsRaw("control:50,B:50");
      router.refresh();
    } catch (e: any) {
      toast.error(`建立失敗：${e?.message || ""}`);
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    const before = exps;
    setExps((es) => es.map((e) => e.id === id ? { ...e, status } : e));
    const res = await fetch(`/api/admin/ab/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setExps(before);
      toast.error("切換失敗");
    } else toast.success(`狀態：${status}`);
  };

  const remove = async (id: string, key: string) => {
    const ok = await confirm({ title: `刪除實驗「${key}」？`, description: "會連同 assignments 一起刪除。", destructive: true, confirmLabel: "刪除" });
    if (!ok) return;
    const res = await fetch(`/api/admin/ab/${id}`, { method: "DELETE" });
    if (res.ok) {
      setExps((es) => es.filter((e) => e.id !== id));
      toast.success("已刪除");
    } else toast.error("刪除失敗");
  };

  return (
    <div className="space-y-4">
      {/* 新增 */}
      <div className="rounded-xl bg-bg-card border border-border p-3 space-y-2">
        <div className="text-sm font-bold">＋ 新增實驗</div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr_auto] gap-2">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="key（程式碼用、e.g. pet-shape）"
            className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="說明"
            className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
          />
          <input
            value={variantsRaw}
            onChange={(e) => setVariantsRaw(e.target.value)}
            placeholder="variants（格式：A:50,B:50）"
            className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
          />
          <button onClick={create} disabled={creating} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-50 flex items-center gap-1">
            <Plus size={13} /> 建立
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="space-y-3">
        {exps.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm rounded-xl bg-bg-card border border-border">
            還沒有實驗、上面建一個開始
          </div>
        ) : exps.map((e) => {
          const s = stats[e.id] ?? { total: 0, byVariant: {}, conversions: {} };
          return (
            <div key={e.id} className="rounded-xl bg-bg-card border border-border p-4">
              <div className="flex items-start gap-2 mb-3">
                <code className="text-sm font-bold text-accent">{e.key}</code>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${STATUS_COLOR[e.status]}`}>{e.status}</span>
                <span className="text-[10px] text-fg-muted ml-auto">{formatTW(e.created_at)}</span>
              </div>
              {e.description && <p className="text-sm text-fg-muted mb-3">{e.description}</p>}

              <div className="space-y-1.5 mb-3">
                {(e.variants ?? []).map((v) => {
                  const count = s.byVariant[v.key] ?? 0;
                  const conv = s.conversions[v.key] ?? 0;
                  const rate = count > 0 ? ((conv / count) * 100).toFixed(1) : "—";
                  return (
                    <div key={v.key} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-bg">
                      <span className="font-mono w-20 truncate">{v.key}</span>
                      <span className="text-[10px] text-fg-muted">weight {v.weight}</span>
                      <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${s.total > 0 ? (count / s.total) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-fg-muted">{count} assigns · {conv} conv · {rate}%</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                {e.status === "draft" || e.status === "paused" ? (
                  <button onClick={() => setStatus(e.id, "running")} className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                    <Play size={11} /> 啟動
                  </button>
                ) : null}
                {e.status === "running" && (
                  <button onClick={() => setStatus(e.id, "paused")} className="text-xs px-3 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 flex items-center gap-1">
                    <Pause size={11} /> 暫停
                  </button>
                )}
                {(e.status === "running" || e.status === "paused") && (
                  <button onClick={() => setStatus(e.id, "completed")} className="text-xs px-3 py-1 rounded-lg bg-blue-500/15 text-blue-400 flex items-center gap-1">
                    <Square size={11} /> 結束
                  </button>
                )}
                <button onClick={() => remove(e.id, e.key)} className="ml-auto text-xs px-2 py-1 text-fg-muted hover:text-red-400 flex items-center gap-1">
                  <Trash2 size={11} /> 刪除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
