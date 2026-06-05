import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { formatTW, formatTWRelative } from "@/lib/format-date";
import { ArrowLeft } from "lucide-react";
import { ReplyForm } from "./ReplyForm";

export const dynamic = "force-dynamic";

export default async function CRMTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["owner", "admin", "teacher", "assistant"].includes(profile?.role ?? "")) redirect("/");

  const { id } = await params;
  const admin = createSupabaseAdmin();

  const [{ data: ticket }, { data: messages }] = await Promise.all([
    admin
      .from("tickets")
      .select("*, profiles!tickets_user_id_fkey(username, display_name, avatar_url)")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("ticket_messages")
      .select("*, profiles!ticket_messages_author_id_fkey(username, display_name)")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ] as any);

  if (!ticket) notFound();

  const t = ticket as any;
  const senderName =
    t.profiles?.display_name ||
    t.profiles?.username ||
    (t.meta?.sender_name as string) ||
    "LINE訪客";
  const isLineGuest = !t.user_id && t.meta?.source === "user_line_bot";

  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/crm") as any}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent"
      >
        <ArrowLeft size={14} /> 回 CRM 列表
      </Link>

      {/* Ticket Header */}
      <header className="bg-bg-card border border-border rounded-xl p-4 space-y-2">
        <h1 className="text-lg font-bold">{t.subject}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <span>來自：<b className="text-fg">{senderName}</b></span>
          {isLineGuest && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-900 dark:text-green-200">
              💚 LINE 訪客（未綁帳號）
            </span>
          )}
          <span>·</span>
          <span>類別：{t.category ?? "support"}</span>
          <span>·</span>
          <span>優先：{t.priority ?? "normal"}</span>
          <span>·</span>
          <span>狀態：<StatusBadge status={t.status} /></span>
          <span className="ml-auto">建立 {formatTWRelative(t.created_at)}</span>
        </div>
      </header>

      {/* Message timeline */}
      <section className="space-y-2">
        {(messages ?? []).length === 0 ? (
          <div className="text-center py-8 text-fg-muted text-sm bg-bg-card rounded-xl border border-border">
            還沒有訊息
          </div>
        ) : (
          (messages as any[]).map((m: any) => {
            const isStaff = m.is_staff || m.author_type === "staff";
            const author =
              m.profiles?.display_name ||
              m.profiles?.username ||
              (isStaff ? "客服" : senderName);
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3 ${
                  isStaff
                    ? "bg-accent/5 border-accent/30 ml-8"
                    : "bg-bg-card border-border mr-8"
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-xs text-fg-muted">
                  <span className={isStaff ? "text-accent font-semibold" : "font-semibold text-fg"}>
                    {isStaff ? "💬 " : "👤 "}{author}
                  </span>
                  <span title={formatTW(m.created_at)}>{formatTWRelative(m.created_at)}</span>
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            );
          })
        )}
      </section>

      {/* Reply Form */}
      <ReplyForm
        ticketId={t.id}
        targetUserName={senderName}
        ticketSubject={t.subject}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-red-500/20 text-red-900 dark:text-red-100",
    pending: "bg-yellow-500/20 text-yellow-900 dark:text-yellow-100",
    waiting_user: "bg-blue-500/20 text-blue-900 dark:text-blue-100",
    resolved: "bg-green-500/20 text-green-900 dark:text-green-100",
    closed: "bg-gray-500/20 text-gray-900 dark:text-gray-100",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${map[status] ?? "bg-bg-elevated"}`}>
      {status}
    </span>
  );
}
