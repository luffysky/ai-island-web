"use client";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function useUserActions(user: any) {
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
      credentials: "include",
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
      credentials: "include",
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
      credentials: "include",
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

  const onGrantDone = (kind: string, data: any) => {
    if (kind === "xp" && typeof data.newXp === "number") {
      setLocalXp(data.newXp);
      if (typeof data.newLevel === "number") setLocalLevel(data.newLevel);
    }
    if (kind === "zcoin" && typeof data.newBalance === "number") setLocalCoin(data.newBalance);
  };

  return {
    role,
    busy,
    aiUnlimited,
    aiBusy,
    grantOpen,
    setGrantOpen,
    localXp,
    localLevel,
    localCoin,
    toggleAiUnlimited,
    updateRole,
    banUser,
    onGrantDone,
  };
}
