"use client";
import { ShieldCheck, Shield, Ban, Sparkles, Gift } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { GrantModal } from "./GrantModal";
import { formatTWDate, formatTWRelative } from "@/lib/format-date";
import { useUserActions } from "./_useUserActions";

const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";

export function UserRow({ user }: { user: any }) {
  const a = useUserActions(user);
  const detailHref = `/${ADMIN_SLUG}/admin/users/${user.id}`;

  return (
    <>
      <tr className="border-b border-border hover:bg-bg-elevated">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href={detailHref as any} className="shrink-0">
              <RowAvatar src={user.avatar_url} name={user.display_name || user.username} />
            </Link>
            <div className="min-w-0">
              <Link href={detailHref as any} className="font-semibold flex items-center gap-1 hover:text-accent transition">
                {user.display_name || user.username}
                {a.role === "admin" && <ShieldCheck size={14} className="text-yellow-400" />}
                {a.role === "editor" && <Shield size={14} className="text-blue-400" />}
              </Link>
              <div className="text-xs text-fg-muted">@{user.username}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-accent font-bold">Lv {a.localLevel}</td>
        <td className="px-4 py-3">{a.localXp.toLocaleString()}</td>
        <td className="px-4 py-3 text-yellow-400">{a.localCoin}</td>
        <td className="px-4 py-3">🔥 {user.streak_days ?? 0}</td>
        <td className="px-4 py-3">
          <select
            value={a.role}
            onChange={(e) => a.updateRole(e.target.value)}
            disabled={a.busy}
            className="bg-bg-elevated border border-border rounded px-2 py-1 text-xs disabled:opacity-50"
          >
            <option value="member">member</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </td>
        <td className="px-4 py-3 text-xs text-fg-muted">
          <div title={`註冊：${formatTWDate(user.created_at)}（台北）`}>{formatTWDate(user.created_at)}</div>
          {user.last_active_at && (
            <div className="text-[10px] opacity-70" title={`最後活躍：${formatTWRelative(user.last_active_at)}`}>
              活躍 {formatTWRelative(user.last_active_at)}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => a.setGrantOpen(true)}
              className="text-xs text-accent hover:underline flex items-center gap-1"
              title="發放 XP / Z-coin / 成就"
            >
              <Gift size={12} /> 補帳
            </button>
            <button
              onClick={a.toggleAiUnlimited}
              disabled={a.aiBusy}
              className={`text-xs flex items-center gap-1 disabled:opacity-50 ${
                a.aiUnlimited
                  ? "text-accent font-semibold"
                  : "text-fg-muted hover:text-accent"
              }`}
              title={a.aiUnlimited ? "AI 無限特權：開啟中（點擊關閉）" : "AI 無限特權：關閉（點擊開啟）"}
            >
              <Sparkles size={12} className={a.aiUnlimited ? "fill-current" : ""} />
              {a.aiUnlimited ? "AI 特權 ✓" : "AI 特權"}
            </button>
            <button
              onClick={a.banUser}
              className="text-xs text-red-400 hover:underline flex items-center gap-1"
              title="封鎖"
            >
              <Ban size={12} /> 封鎖
            </button>
          </div>
        </td>
      </tr>
      {a.grantOpen && (
        <GrantModal
          user={user}
          onClose={() => a.setGrantOpen(false)}
          onDone={a.onGrantDone}
        />
      )}
    </>
  );
}

function RowAvatar({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={32}
        height={32}
        unoptimized
        className="w-8 h-8 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center font-bold text-black text-sm">
      {initial}
    </div>
  );
}
