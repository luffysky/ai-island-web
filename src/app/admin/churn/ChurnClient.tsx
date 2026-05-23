"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Download, Mail, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatTW, formatTWRelative } from "@/lib/format-date";
import { adminHref } from "@/lib/admin-href";

type User = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  z_coin: number;
  streak_days: number;
  last_active_at: string | null;
  created_at: string;
};

export function ChurnClient({
  users,
  filterDays,
  filterMinXp,
  total,
}: {
  users: User[];
  filterDays: number;
  filterMinXp: number;
  total: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [minXp, setMinXp] = useState(String(filterMinXp));

  const apply = () => {
    router.push(`?days=${filterDays}&min_xp=${minXp}` as any);
  };

  const exportCsv = () => {
    const headers = ["user_id", "username", "display_name", "xp", "level", "z_coin", "streak_days", "last_active_at", "created_at"];
    const rows = users.map((u) => [
      u.id,
      u.username,
      u.display_name ?? "",
      u.xp,
      u.level,
      u.z_coin,
      u.streak_days,
      u.last_active_at ?? "",
      u.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `churn-${filterDays}d-xp${filterMinXp}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`已匯出 ${users.length} 筆 CSV`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-bg-card border border-border p-3 flex items-center gap-2 flex-wrap text-sm">
        <span className="text-fg-muted">最少 XP：</span>
        <input
          type="number"
          value={minXp}
          onChange={(e) => setMinXp(e.target.value)}
          className="w-24 bg-bg border border-border rounded px-2 py-1 text-sm"
        />
        <button onClick={apply} className="px-3 py-1 rounded-lg bg-accent text-black font-bold text-sm">套用</button>
        <span className="text-fg-muted ml-2">→ {total.toLocaleString()} 位匹配</span>
        <button onClick={exportCsv} disabled={users.length === 0} className="ml-auto px-3 py-1.5 rounded-lg border border-border hover:border-accent flex items-center gap-1 text-sm disabled:opacity-50">
          <Download size={13} /> CSV
        </button>
      </div>

      <div className="rounded-xl bg-bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-bg-elevated text-fg-muted text-xs">
            <tr>
              <th className="text-left px-3 py-2">使用者</th>
              <th className="text-left px-3 py-2">XP / Lv</th>
              <th className="text-left px-3 py-2">Z-coin</th>
              <th className="text-left px-3 py-2">連勝</th>
              <th className="text-left px-3 py-2">最後活躍</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-fg-muted text-sm">沒有符合的高價值流失用戶 ✨</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt="" width={28} height={28} unoptimized className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center text-xs">{(u.display_name || u.username || "?")[0]}</div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{u.display_name || u.username}</div>
                      <div className="text-[10px] text-fg-muted">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-accent font-bold">{u.xp.toLocaleString()} / Lv {u.level}</td>
                <td className="px-3 py-2 text-yellow-400">{u.z_coin}</td>
                <td className="px-3 py-2">🔥 {u.streak_days}</td>
                <td className="px-3 py-2 text-xs">
                  {u.last_active_at ? (
                    <>
                      <div className="text-warning">{formatTWRelative(u.last_active_at)}</div>
                      <div className="text-[10px] text-fg-muted">{formatTW(u.last_active_at)}</div>
                    </>
                  ) : <span className="text-fg-muted">從未</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={adminHref(`/admin/users/${u.id}`) as any} className="text-xs text-accent hover:underline flex items-center gap-0.5 justify-end">
                    詳細 <ArrowRight size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-bg-card border border-border p-3 text-xs text-fg-muted flex items-center gap-2">
        <Mail size={12} />
        <span>下一步可以：CSV 餵 email 行銷工具（Mailchimp/Resend）發召回信、或透過 /admin/users/batch 批次發 z 幣補償誘餌。</span>
      </div>
    </div>
  );
}
