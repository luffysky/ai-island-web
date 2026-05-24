import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import Image from "next/image";
import { adminHref } from "@/lib/admin-href";
import { formatTWRelative } from "@/lib/format-date";
import { EmptyState } from "@/components/ui/EmptyState";
import { PushUserButton } from "./PushUserButton";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLineUsersPage() {
  const admin = createSupabaseAdmin();
  const { data: users } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, level, line_user_id, line_notify_enabled, line_bound_at, last_active_at")
    .not("line_user_id", "is", null)
    .order("line_bound_at", { ascending: false })
    .limit(200);

  const list = (users as any[]) ?? [];

  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/line") as any}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent"
      >
        <ArrowLeft size={14} /> 回 LINE 控制台
      </Link>

      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">👥 LINE 綁定用戶</h1>
        <p className="text-sm text-fg-muted mt-1">
          共 {list.length} 人綁定、點「推訊息」直接送 LINE。
        </p>
      </header>

      {list.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="還沒有任何用戶綁 LINE"
          desc="user 要先到 /settings → 🌱 LINE 個人通知、加 bot 為好友 + 輸入 code 綁定"
        />
      ) : (
        <ul className="space-y-2">
          {list.map((u) => (
            <li key={u.id} className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-wrap">
              <UserAvatar src={u.avatar_url} name={u.display_name || u.username} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{u.display_name || u.username}</div>
                <div className="text-xs text-fg-muted truncate">
                  @{u.username} · Lv {u.level ?? 1}
                  {!u.line_notify_enabled && (
                    <span className="ml-2 text-[10px] px-1 rounded bg-yellow-500/15 text-yellow-400">已關通知</span>
                  )}
                </div>
                <div className="text-[10px] text-fg-muted mt-0.5">
                  綁於 {u.line_bound_at ? formatTWRelative(u.line_bound_at) : "—"}
                  {u.last_active_at && <> · 活躍 {formatTWRelative(u.last_active_at)}</>}
                </div>
              </div>
              <PushUserButton userId={u.id} userName={u.display_name || u.username} notifyEnabled={u.line_notify_enabled !== false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UserAvatar({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        unoptimized
        className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center font-bold text-black">
      {(name || "?").trim()[0]?.toUpperCase() || "?"}
    </div>
  );
}
