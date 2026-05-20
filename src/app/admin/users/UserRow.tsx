"use client";
import { useState } from "react";
import { ShieldCheck, Shield, Ban } from "lucide-react";

export function UserRow({ user }: { user: any }) {
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);

  const updateRole = async (newRole: string) => {
    if (role === newRole) return;
    if (!confirm(`把 ${user.username} 改成 ${newRole}？`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`失敗：${data.error}`);
      } else {
        setRole(newRole);
      }
    } finally {
      setBusy(false);
    }
  };

  const banUser = async () => {
    if (!confirm(`封鎖 ${user.username}？`)) return;
    await fetch(`/api/admin/ban-user`, {
      method: "POST",
      body: JSON.stringify({ userId: user.id }),
    });
    alert("已封鎖");
  };

  return (
    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]">
      <td className="px-4 py-3">
        <div className="font-semibold flex items-center gap-1">
          {user.display_name || user.username}
          {role === "admin" && <ShieldCheck size={14} className="text-yellow-400" />}
          {role === "editor" && <Shield size={14} className="text-blue-400" />}
        </div>
        <div className="text-xs text-[var(--color-fg-muted)]">@{user.username}</div>
      </td>
      <td className="px-4 py-3 text-[var(--color-accent)] font-bold">Lv {user.level ?? 1}</td>
      <td className="px-4 py-3">{user.xp?.toLocaleString() ?? 0}</td>
      <td className="px-4 py-3 text-yellow-400">{user.z_coin ?? 0}</td>
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
        <button
          onClick={banUser}
          className="text-xs text-red-400 hover:underline flex items-center gap-1"
          title="封鎖"
        >
          <Ban size={12} /> 封鎖
        </button>
      </td>
    </tr>
  );
}
