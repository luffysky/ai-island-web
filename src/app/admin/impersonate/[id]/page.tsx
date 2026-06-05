import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, Bookmark, FileText, Trophy, Clock, ShieldCheck } from "lucide-react";
import { formatTW, formatTWDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

/**
 * /admin/impersonate/[id]
 * 以該使用者身份「檢視」（read-only）— 顯示對方視角能看到的：profile / progress / notes / bookmarks / recent activity / todos
 * 重要：不修改任何資料、不能操作對方帳號。
 */
export default async function ImpersonateViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin" && me?.role !== "owner") redirect("/");

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  // 取最近一筆 impersonation 紀錄（同 admin 對同 target）— UI 末尾可叫 end-session
  const { data: lastImp } = await admin
    .from("admin_impersonations")
    .select("id, reason, started_at")
    .eq("admin_id", user.id)
    .eq("target_user_id", id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [
    { data: progress },
    { data: notes },
    { data: bookmarks },
    { data: todos },
    { data: lastEvents },
  ] = await Promise.all([
    admin.from("lesson_progress").select("chapter_id, lesson_id, created_at:completed_at").eq("user_id", id).order("completed_at", { ascending: false }).limit(10),
    admin.from("notes").select("id, content, lesson_id, updated_at").eq("user_id", id).order("updated_at", { ascending: false }).limit(10),
    admin.from("bookmarks").select("id, lesson_id, lesson_title, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("todos").select("*").eq("user_id", id).eq("completed", false).order("created_at", { ascending: false }).limit(10),
    admin.from("learning_events").select("event_type, chapter_id, lesson_id, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
  ] as any);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-yellow-500/60 bg-yellow-500/10 p-3 flex items-center gap-2 text-sm">
        <ShieldCheck className="text-yellow-500" size={18} />
        <span className="font-bold text-yellow-500">Impersonate 模式 (read-only)</span>
        <span className="text-fg-muted">— 你以 admin 身份檢視這位使用者、所有動作會被紀錄。</span>
        {lastImp && (
          <span className="ml-auto text-[10px] text-fg-muted">
            理由：「{lastImp.reason}」· 開始 {formatTW(lastImp.started_at)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 bg-bg-card border border-border rounded-2xl p-4">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={64} height={64} unoptimized className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-2xl text-black font-bold">
            {(profile.display_name || profile.username || "?")[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
          <div className="text-xs text-fg-muted">@{profile.username} · Lv {profile.level ?? 1} · {profile.xp ?? 0} XP · 🪙 {profile.z_coin ?? 0}</div>
          <div className="text-[10px] text-fg-muted mt-1">
            註冊 {formatTWDate(profile.created_at)} · 最後活躍 {profile.last_active_at ? formatTW(profile.last_active_at) : "—"}
          </div>
        </div>
        <Link href="/admin/users" className="text-sm text-accent hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> 回使用者列表
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="📚 最近完成 lesson" icon={<Clock size={14} />}>
          {(progress ?? []).length === 0 ? <Empty>無</Empty> : (progress ?? []).map((p: any, i: number) => (
            <Row key={i} left={`Ch ${p.chapter_id}`} mid={p.lesson_id} right={formatTW(p.created_at)} />
          ))}
        </Panel>
        <Panel title="📝 最近筆記" icon={<FileText size={14} />}>
          {(notes ?? []).length === 0 ? <Empty>無</Empty> : (notes ?? []).map((n: any) => (
            <Row key={n.id} left="📝" mid={(n.content || "").slice(0, 80)} right={formatTW(n.updated_at)} />
          ))}
        </Panel>
        <Panel title="⭐ 收藏" icon={<Bookmark size={14} />}>
          {(bookmarks ?? []).length === 0 ? <Empty>無</Empty> : (bookmarks ?? []).map((b: any) => (
            <Row key={b.id} left="⭐" mid={b.lesson_title || b.lesson_id} right={formatTWDate(b.created_at)} />
          ))}
        </Panel>
        <Panel title="📋 待辦中" icon={<Trophy size={14} />}>
          {(todos ?? []).length === 0 ? <Empty>無</Empty> : (todos ?? []).map((t: any) => (
            <Row key={t.id} left={t.priority === 1 ? "🔴" : t.priority === 2 ? "🟡" : "🟢"} mid={t.title} right={t.due_date ?? "—"} />
          ))}
        </Panel>
        <Panel title="🕐 最近學習行為" icon={<Eye size={14} />}>
          {(lastEvents ?? []).length === 0 ? <Empty>無</Empty> : (lastEvents ?? []).map((e: any, i: number) => (
            <Row key={i} left={e.event_type} mid={e.lesson_id ?? `Ch ${e.chapter_id}`} right={formatTW(e.created_at)} />
          ))}
        </Panel>
      </div>

      <div className="text-right">
        <Link href="/admin/impersonate" className="text-xs text-fg-muted hover:text-accent">
          ← 回 impersonate 列表
        </Link>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-bg-card border border-border p-3">
      <div className="text-sm font-bold mb-2 flex items-center gap-1">{icon} {title}</div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}
function Row({ left, mid, right }: { left: React.ReactNode; mid: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs">
      <span className="text-fg-muted shrink-0 w-16 truncate">{left}</span>
      <span className="flex-1 truncate">{mid}</span>
      <span className="text-fg-muted shrink-0">{right}</span>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-fg-muted py-2 text-center">{children}</div>;
}
