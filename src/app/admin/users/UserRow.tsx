"use client";
import { useState } from "react";
import { ShieldCheck, Shield, Ban, Sparkles, Gift } from "lucide-react";
import Link from "next/link";
import { GrantModal } from "./GrantModal";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";

export function UserRow({ user }: { user: any }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);
  const [aiUnlimited, setAiUnlimited] = useState(!!user.ai_unlimited);
  const [aiBusy, setAiBusy] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [localXp, setLocalXp] = useState<number>(user.xp ?? 0);
  const [localLevel, setLocalLevel] = useState<number>(user.level ?? 1);
  const [localCoin, setLocalCoin] = useState<number>(user.z_coin ?? 0);

  const toggleAiUnlimited = async () => {
    const next = !aiUnlimited;
    const ok = await confirm({
      title: next ? `開啟 ${user.username} 的 AI 無限特權？` : `關閉 ${user.username} 的 AI 特權？`,
      description: next ? "對方可免費無限制使用 AI。" : "對方會回到一般額度限制。",
      confirmLabel: next ? "開啟" : "關閉",
      destructive: !next,
    });
    if (!ok) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/admin/users/ai-unlimited", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`失敗：${data.error}`);
      } else {
        setAiUnlimited(next);
        toast.success(next ? "已開啟 AI 特權" : "已關閉 AI 特權");
      }
    } finally {
      setAiBusy(false);
    }
  };

  const updateRole = async (newRole: string) => {
    if (role === newRole) return;
    const ok = await confirm({
      title: `把 ${user.username} 改成 ${newRole}？`,
      description: newRole === "admin" ? "admin 擁有後台完整權限、請確認對象。" : undefined,
      confirmLabel: "套用",
      destructive: newRole === "admin",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`失敗：${data.error}`);
      } else {
        setRole(newRole);
        toast.success(`已改為 ${newRole}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const banUser = async () => {
    const ok = await confirm({
      title: `封鎖 ${user.username}？`,
      description: "對方將無法登入、需要時可從後台解除。",
      confirmLabel: "封鎖",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/ban-user`, {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`封鎖失敗：${data.error || "未知錯誤"}`);
      } else {
        toast.success(`已封鎖 ${user.username}`);
      }
    } catch (e: any) {
      toast.error(`封鎖失敗：${e?.message || "網路錯誤"}`);
    }
  };

  const detailHref = `/${ADMIN_SLUG}/admin/users/${user.id}`;

  return (
    <>
      <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]">
        <td className="px-4 py-3">
          <Link href={detailHref as any} className="font-semibold flex items-center gap-1 hover:text-[var(--color-accent)] transition">
            {user.display_name || user.username}
            {role === "admin" && <ShieldCheck size={14} className="text-yellow-400" />}
            {role === "editor" && <Shield size={14} className="text-blue-400" />}
          </Link>
          <div className="text-xs text-[var(--color-fg-muted)]">@{user.username}</div>
        </td>
        <td className="px-4 py-3 text-[var(--color-accent)] font-bold">Lv {localLevel}</td>
        <td className="px-4 py-3">{localXp.toLocaleString()}</td>
        <td className="px-4 py-3 text-yellow-400">{localCoin}</td>
        <td className="px-4 py-3">🔥 {user.streak_days ?? 0}</td>
        <td className="px-4 py-3">
          <select
            value={role}
            onChange={(e) => updateRole(e.target.value)}
            disabled={busy}
            className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1 text-xs disabled:opacity-50"
          >
            <option value="member">member</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </td>
        <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
          {new Date(user.created_at).toLocaleDateString("zh-TW")}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setGrantOpen(true)}
              className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
              title="發放 XP / Z-coin / 成就"
            >
              <Gift size={12} /> 補帳
            </button>
            <button
              onClick={toggleAiUnlimited}
              disabled={aiBusy}
              className={`text-xs flex items-center gap-1 disabled:opacity-50 ${
                aiUnlimited
                  ? "text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]"
              }`}
              title={aiUnlimited ? "AI 無限特權：開啟中（點擊關閉）" : "AI 無限特權：關閉（點擊開啟）"}
            >
              <Sparkles size={12} className={aiUnlimited ? "fill-current" : ""} />
              {aiUnlimited ? "AI 特權 ✓" : "AI 特權"}
            </button>
            <button
              onClick={banUser}
              className="text-xs text-red-400 hover:underline flex items-center gap-1"
              title="封鎖"
            >
              <Ban size={12} /> 封鎖
            </button>
          </div>
        </td>
      </tr>
      {grantOpen && (
        <GrantModal
          user={user}
          onClose={() => setGrantOpen(false)}
          onDone={(kind, data) => {
            if (kind === "xp" && typeof data.newXp === "number") {
              setLocalXp(data.newXp);
              if (typeof data.newLevel === "number") setLocalLevel(data.newLevel);
            }
            if (kind === "zcoin" && typeof data.newBalance === "number") setLocalCoin(data.newBalance);
          }}
        />
      )}
    </>
  );
}
