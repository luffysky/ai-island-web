"use client";
import { ShieldCheck, Shield, Ban, Sparkles, Gift, Flame, Coins, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { GrantModal } from "./GrantModal";
import { formatTWDate, formatTWRelative } from "@/lib/format-date";
import { useUserActions } from "./_useUserActions";

const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover ring-1 ring-border"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <div
      className="rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center font-bold text-black"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}

export function UserCard({ user, isOwner }: { user: any; isOwner?: boolean }) {
  const a = useUserActions(user);
  const detailHref = `/${ADMIN_SLUG}/admin/users/${user.id}`;
  const NameInner = (
    <>
      <div className="font-bold flex items-center gap-1 truncate">
        {user.display_name || user.username}
        {a.role === "admin" && <ShieldCheck size={14} className="text-yellow-400 shrink-0" />}
        {a.role === "editor" && <Shield size={14} className="text-blue-400 shrink-0" />}
      </div>
      <div className="text-xs text-fg-muted truncate">@{user.username}</div>
    </>
  );

  return (
    <>
      <article className="bg-bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 border-b border-border flex items-center gap-3">
          {isOwner ? (
            <Link href={detailHref as any} className="shrink-0">
              <Avatar src={user.avatar_url} name={user.display_name || user.username} size={40} />
            </Link>
          ) : (
            <span className="shrink-0">
              <Avatar src={user.avatar_url} name={user.display_name || user.username} size={40} />
            </span>
          )}
          {isOwner ? (
            <Link href={detailHref as any} className="flex-1 min-w-0 hover:text-accent transition">
              {NameInner}
            </Link>
          ) : (
            <div className="flex-1 min-w-0">{NameInner}</div>
          )}
          <span className="text-xs px-2 py-0.5 rounded bg-gradient-to-r from-accent to-accent-2 text-black font-bold shrink-0">
            Lv {a.localLevel}
          </span>
        </header>

        {/* Body — 該員所有屬性、卡內可獨立 scroll */}
        <div className="px-4 py-3 max-h-[180px] overflow-y-auto space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-fg-muted">XP</div>
              <div className="font-semibold">{a.localXp.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-fg-muted flex items-center gap-1"><Coins size={11} className="text-yellow-400" /> Z-coin</div>
              <div className="font-semibold text-yellow-400">{a.localCoin}</div>
            </div>
            <div>
              <div className="text-fg-muted flex items-center gap-1"><Flame size={11} className="text-orange-400" /> 連勝</div>
              <div className="font-semibold">{user.streak_days ?? 0}</div>
            </div>
          </div>

          <div className="text-xs text-fg-muted pt-1 border-t border-border space-y-0.5">
            <div>註冊：{formatTWDate(user.created_at)}</div>
            {user.last_active_at && <div>活躍：{formatTWRelative(user.last_active_at)}</div>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs text-fg-muted">角色</label>
            <select
              value={a.role}
              onChange={(e) => a.updateRole(e.target.value)}
              disabled={a.busy}
              className="bg-bg-elevated border border-border rounded px-2 py-1 text-xs disabled:opacity-50"
            >
              <option value="member">member</option>
              <option value="editor">editor</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
          </div>
        </div>

        {/* Footer — 操作鍵 */}
        <footer className="px-4 py-2 border-t border-border bg-bg-elevated/40 flex items-center justify-between gap-2 text-xs">
          <button
            onClick={() => a.setGrantOpen(true)}
            className="flex items-center gap-1 text-accent hover:underline px-1 py-1"
            title="發放 XP / Z-coin / 成就"
          >
            <Gift size={13} /> 補帳
          </button>
          <button
            onClick={a.toggleAiUnlimited}
            disabled={a.aiBusy}
            className={`flex items-center gap-1 disabled:opacity-50 px-1 py-1 ${
              a.aiUnlimited
                ? "text-accent font-semibold"
                : "text-fg-muted hover:text-accent"
            }`}
            title={a.aiUnlimited ? "AI 無限特權開啟中" : "AI 無限特權關閉"}
          >
            <Sparkles size={13} className={a.aiUnlimited ? "fill-current" : ""} />
            {a.aiUnlimited ? <>AI <Check size={11} /></> : "AI"}
          </button>
          <button
            onClick={a.banUser}
            className="flex items-center gap-1 text-red-400 hover:underline px-1 py-1"
            title="封鎖"
          >
            <Ban size={13} /> 封鎖
          </button>
        </footer>
      </article>

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
