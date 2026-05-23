"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Trash2, Power } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Rule = {
  scope: string;
  limit_count: number;
  window_seconds: number;
  enabled: boolean;
  note: string | null;
  updated_at: string;
};

export function RateLimitRulesClient({
  rules: initial,
  hitCount,
}: {
  rules: Rule[];
  hitCount: Record<string, number>;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rules, setRules] = useState(initial);
  const [newScope, setNewScope] = useState("");
  const [creating, setCreating] = useState(false);

  const update = async (scope: string, patch: Partial<Rule>) => {
    const before = rules;
    setRules((rs) => rs.map((r) => (r.scope === scope ? { ...r, ...patch } : r)));
    try {
      const res = await fetch("/api/admin/rate-limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, ...patch }),
      });
      if (!res.ok) throw new Error();
      toast.success("已儲存");
    } catch {
      setRules(before);
      toast.error("儲存失敗");
    }
  };

  const remove = async (scope: string) => {
    const ok = await confirm({
      title: `刪除規則「${scope}」？`,
      description: "刪除後該 scope 將不再限流。",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;
    const before = rules;
    setRules((rs) => rs.filter((r) => r.scope !== scope));
    try {
      const res = await fetch(`/api/admin/rate-limits?scope=${encodeURIComponent(scope)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("已刪除規則");
    } catch {
      setRules(before);
      toast.error("刪除失敗");
    }
  };

  const create = async () => {
    const s = newScope.trim();
    if (!s) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/rate-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: s, limit_count: 30, window_seconds: 60 }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setNewScope("");
      router.refresh();
      toast.success(`已新增 ${s}`);
    } catch (e: any) {
      toast.error(`新增失敗：${e?.message || ""}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* 新增 */}
      <div className="rounded-xl bg-bg-card border border-border p-3 mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-fg-muted block mb-1">scope（例：ai:chat / blog:post）</label>
          <input
            value={newScope}
            onChange={(e) => setNewScope(e.target.value)}
            placeholder="namespace:action"
            className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </div>
        <button
          onClick={create}
          disabled={!newScope.trim() || creating}
          className="px-4 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          <Plus size={12} /> 新增規則
        </button>
      </div>

      {/* 表格 */}
      <div className="rounded-xl bg-bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-bg-elevated text-fg-muted text-xs">
            <tr>
              <th className="text-left px-3 py-2">Scope</th>
              <th className="text-left px-3 py-2">每視窗上限</th>
              <th className="text-left px-3 py-2">視窗（秒）</th>
              <th className="text-left px-3 py-2">24h 命中</th>
              <th className="text-left px-3 py-2">啟用</th>
              <th className="text-left px-3 py-2">備註</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rules.map((r) => (
              <tr key={r.scope}>
                <td className="px-3 py-2 font-mono text-accent">{r.scope}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    defaultValue={r.limit_count}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v !== r.limit_count) update(r.scope, { limit_count: v });
                    }}
                    className="w-20 bg-bg border border-border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    defaultValue={r.window_seconds}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v !== r.window_seconds) update(r.scope, { window_seconds: v });
                    }}
                    className="w-20 bg-bg border border-border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 text-fg-muted">{hitCount[r.scope] ?? 0}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => update(r.scope, { enabled: !r.enabled })}
                    className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      r.enabled
                        ? "bg-accent/15 text-accent"
                        : "bg-bg-elevated text-fg-muted"
                    }`}
                  >
                    <Power size={11} /> {r.enabled ? "啟用中" : "已停用"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={r.note ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== r.note) update(r.scope, { note: v || null });
                    }}
                    className="w-full bg-bg border border-border rounded px-2 py-1 text-sm"
                    placeholder="說明..."
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => remove(r.scope)}
                    className="text-fg-muted hover:text-red-400 p-1"
                    aria-label="刪除"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-fg-muted text-sm">
                  目前沒有規則、上面新增一條開始
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-fg-muted mt-3">
        ℹ️ 規則改完即時生效（下個請求就會用新值）。
      </p>
    </div>
  );
}
