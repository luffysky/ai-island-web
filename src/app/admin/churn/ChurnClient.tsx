"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Download, Mail, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatTW, formatTWRelative } from "@/lib/format-date";
import { adminHref } from "@/lib/admin-href";
import { SEGMENT_LABEL, SEGMENT_COLOR, type RfmSegment } from "@/lib/rfm";

type Row = {
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
  r: number;
  f: number;
  m: number;
  rfm: string;
  segment: RfmSegment;
  churnRisk: number;
  recencyDays: number | null;
  frequency90: number;
  monetary: number;
};

export function ChurnClient({
  users,
  filterSeg,
  filterMinXp,
}: {
  users: Row[];
  filterSeg: RfmSegment | "all";
  filterMinXp: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [minXp, setMinXp] = useState(String(filterMinXp));

  const apply = () => {
    router.push(`?seg=${filterSeg}&min_xp=${minXp}` as any);
  };

  const exportCsv = () => {
    const headers = ["user_id", "username", "display_name", "xp", "level", "z_coin", "segment", "rfm", "r", "f", "m", "churn_risk", "recency_days", "frequency_90d", "monetary_twd", "last_active_at"];
    const rows = users.map((u) => [
      u.id, u.username, u.display_name ?? "",
      u.xp, u.level, u.z_coin,
      u.segment, u.rfm, u.r, u.f, u.m,
      u.churnRisk.toFixed(2),
      u.recencyDays ?? "",
      u.frequency90,
      u.monetary.toFixed(0),
      u.last_active_at ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rfm-churn-${filterSeg}-xp${filterMinXp}-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <input type="number" value={minXp} onChange={(e) => setMinXp(e.target.value)} className="w-24 bg-bg border border-border rounded px-2 py-1 text-sm" />
        <button onClick={apply} className="px-3 py-1 rounded-lg bg-accent text-black font-bold text-sm">套用</button>
        <button onClick={exportCsv} disabled={users.length === 0} className="ml-auto px-3 py-1.5 rounded-lg border border-border hover:border-accent flex items-center gap-1 text-sm disabled:opacity-50">
          <Download size={13} /> CSV
        </button>
      </div>

      <div className="rounded-xl bg-bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead className="bg-bg-elevated text-fg-muted text-xs">
            <tr>
              <th className="text-left px-3 py-2">使用者</th>
              <th className="text-left px-3 py-2">Segment</th>
              <th className="text-left px-3 py-2">RFM</th>
              <th className="text-left px-3 py-2">流失風險</th>
              <th className="text-left px-3 py-2">XP / Lv</th>
              <th className="text-left px-3 py-2">90d 活躍</th>
              <th className="text-left px-3 py-2">付出 TWD</th>
              <th className="text-left px-3 py-2">最後活躍</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-fg-muted text-sm">沒人在這個 segment ✨</td></tr>
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
                <td className="px-3 py-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${SEGMENT_COLOR[u.segment]}`}>{SEGMENT_LABEL[u.segment]}</span>
                </td>
                <td className="px-3 py-2 font-mono">{u.rfm}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                      <div className="h-full bg-red-400" style={{ width: `${u.churnRisk * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-fg-muted">{(u.churnRisk * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-accent font-bold text-xs">{u.xp.toLocaleString()} / Lv {u.level}</td>
                <td className="px-3 py-2 text-xs">{u.frequency90} 天</td>
                <td className="px-3 py-2 text-xs text-yellow-400">{u.monetary.toFixed(0)}</td>
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
        <span>建議行銷：champion / loyal 邀請推薦碼、potential 升等優惠、at_risk + cant_lose 發 z 幣補償、hibernating / lost 走重新激活信。</span>
      </div>
    </div>
  );
}
