"use client";

import { useState } from "react";
import { Play, Users, AlertTriangle, Coins, Award, Ban, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Action =
  | { kind: "set_role"; role: "member" | "editor" | "admin" | "teacher" | "assistant" }
  | { kind: "grant_xp"; amount: number; reason: string }
  | { kind: "grant_zcoin"; amount: number; reason: string }
  | { kind: "ban"; reason: string }
  | { kind: "unban" }
  | { kind: "toggle_ai_unlimited"; enabled: boolean };

export function BatchOpsClient() {
  const toast = useToast();
  const confirm = useConfirm();
  const [idsRaw, setIdsRaw] = useState("");
  const [actionKind, setActionKind] = useState<Action["kind"]>("grant_xp");
  const [role, setRole] = useState<"member" | "editor" | "admin" | "teacher" | "assistant">("member");
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const ids = idsRaw.split(/[\s,\n]+/).map((s) => s.trim()).filter((s) => /^[0-9a-f-]{8,}$/i.test(s));

  const buildAction = (): Action | null => {
    if (actionKind === "set_role") return { kind: "set_role", role };
    if (actionKind === "grant_xp") return { kind: "grant_xp", amount, reason: reason.trim() };
    if (actionKind === "grant_zcoin") return { kind: "grant_zcoin", amount, reason: reason.trim() };
    if (actionKind === "ban") return { kind: "ban", reason: reason.trim() };
    if (actionKind === "unban") return { kind: "unban" };
    if (actionKind === "toggle_ai_unlimited") return { kind: "toggle_ai_unlimited", enabled };
    return null;
  };

  const execute = async () => {
    if (ids.length === 0) {
      toast.warning("沒有有效的 user id");
      return;
    }
    if (ids.length > 500) {
      toast.warning("單批次上限 500 個 id");
      return;
    }
    const action = buildAction();
    if (!action) return;
    if (("reason" in action && !action.reason) || (("reason" in action) && action.reason.length < 5)) {
      toast.warning("理由至少 5 字");
      return;
    }
    if (actionKind === "grant_xp" || actionKind === "grant_zcoin") {
      if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) {
        toast.warning("金額不合理（abs ≤ 100000）");
        return;
      }
    }

    const ok = await confirm({
      title: `對 ${ids.length} 個 user 執行「${actionKind}」？`,
      description: "此操作會即時生效、寫入 audit。",
      confirmLabel: "執行",
      destructive: actionKind === "ban" || actionKind === "set_role",
    });
    if (!ok) return;

    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/users/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: ids, action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      setResult(`✅ 成功 ${j.success} / 失敗 ${j.failed} / 共 ${j.total}`);
      toast.success(`已處理 ${j.success}/${j.total}`);
    } catch (e: any) {
      toast.error(`執行失敗：${e?.message || ""}`);
      setResult(`❌ ${e?.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-bg-card border border-border p-4">
        <label className="text-xs text-fg-muted block mb-1 flex items-center gap-1">
          <Users size={12} /> User IDs（一行一個、空白或逗號分隔皆可、總上限 500）
        </label>
        <textarea
          value={idsRaw}
          onChange={(e) => setIdsRaw(e.target.value)}
          rows={6}
          placeholder="aaaa-bbbb-cccc-...&#10;dddd-eeee-ffff-..."
          className="w-full bg-bg border border-border rounded-lg p-2 text-xs font-mono outline-none focus:border-accent"
        />
        <p className="text-[10px] text-fg-muted mt-1">
          有效 id 數：<span className="font-bold text-accent">{ids.length}</span>
        </p>
      </div>

      <div className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
        <label className="text-xs text-fg-muted block mb-1">操作</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { v: "set_role", l: "設角色", icon: <Sparkles size={12} /> },
            { v: "grant_xp", l: "發 XP", icon: <Award size={12} /> },
            { v: "grant_zcoin", l: "發 Z-coin", icon: <Coins size={12} /> },
            { v: "ban", l: "封鎖", icon: <Ban size={12} /> },
            { v: "unban", l: "解封", icon: <Ban size={12} /> },
            { v: "toggle_ai_unlimited", l: "AI 特權", icon: <Sparkles size={12} /> },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setActionKind(opt.v as any)}
              className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-1 ${
                actionKind === opt.v ? "bg-accent text-black border-accent font-bold" : "border-border hover:border-accent"
              }`}
            >
              {opt.icon} {opt.l}
            </button>
          ))}
        </div>

        {actionKind === "set_role" && (
          <div>
            <label className="text-xs text-fg-muted block mb-1">新角色</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm">
              <option value="member">member</option>
              <option value="editor">editor</option>
              <option value="teacher">teacher</option>
              <option value="assistant">assistant</option>
              <option value="admin">admin</option>
            </select>
          </div>
        )}

        {(actionKind === "grant_xp" || actionKind === "grant_zcoin") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-fg-muted block mb-1">數量（負數=扣）</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted block mb-1">理由</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="補償活動 / 兒童節等"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        )}

        {actionKind === "ban" && (
          <div>
            <label className="text-xs text-fg-muted block mb-1">封鎖理由</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="違反規定..."
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
        )}

        {actionKind === "toggle_ai_unlimited" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            設為「啟用 AI 無限特權」（取消勾即「關閉」）
          </label>
        )}

        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle size={12} /> 動作不可撤銷、會寫 audit log
          </div>
          <button
            onClick={execute}
            disabled={busy || ids.length === 0}
            className="px-5 py-2 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-50 flex items-center gap-1"
          >
            <Play size={13} /> {busy ? "執行中…" : `對 ${ids.length} 人執行`}
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl bg-bg-card border border-border p-4 text-sm">
          {result}
        </div>
      )}
    </div>
  );
}
