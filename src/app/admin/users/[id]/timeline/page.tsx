import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatTW } from "@/lib/format-date";
import { adminHref } from "@/lib/admin-href";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

type Event = {
  at: string;
  kind: string;
  title: string;
  detail?: string;
  tone?: "accent" | "warning" | "danger" | "muted";
};

const KIND_ICON: Record<string, string> = {
  xp_event: "⚡",
  coin_event: "🪙",
  lesson_complete: "📚",
  ai_chat: "💬",
  forum_thread: "🗣️",
  forum_reply: "💭",
  blog_publish: "✍️",
  achievement: "🏆",
  bookmark: "⭐",
  note_save: "📝",
  login_session: "🔑",
  quiz_attempt: "🧠",
};

export default async function UserTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: profile } = await admin.from("profiles").select("username, display_name").eq("id", id).maybeSingle();
  if (!profile) notFound();

  // 抓多張表合併（各取最近 50）
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [
    { data: xp },
    { data: coin },
    { data: lessons },
    { data: forumT },
    { data: forumR },
    { data: blogs },
    { data: ach },
    { data: bookmarks },
    { data: notes },
    { data: sessions },
    { data: quizzes },
  ] = await Promise.all([
    admin.from("xp_events").select("amount, reason, created_at").eq("user_id", id).gte("created_at", since).order("created_at", { ascending: false }).limit(50),
    admin.from("coin_transactions").select("amount, reason, created_at, balance_after").eq("user_id", id).gte("created_at", since).order("created_at", { ascending: false }).limit(50),
    admin.from("lesson_progress").select("chapter_id, lesson_id, created_at").eq("user_id", id).gte("created_at", since).order("created_at", { ascending: false }).limit(50),
    admin.from("forum_threads").select("title, created_at").eq("user_id", id).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    admin.from("forum_replies").select("content, created_at, thread_id").eq("user_id", id).gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    admin.from("user_blog_articles").select("title, created_at, is_public").eq("user_id", id).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    admin.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", id).gte("unlocked_at", since).order("unlocked_at", { ascending: false }).limit(30),
    admin.from("bookmarks").select("lesson_id, lesson_title, created_at").eq("user_id", id).gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    admin.from("notes").select("content, created_at, lesson_id").eq("user_id", id).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    admin.from("analytics_sessions").select("started_at").eq("user_id", id).gte("started_at", since).order("started_at", { ascending: false }).limit(30),
    admin.from("quiz_attempts").select("chapter_id, score, total_questions, attempted_at").eq("user_id", id).gte("attempted_at", since).order("attempted_at", { ascending: false }).limit(20),
  ] as any);

  const events: Event[] = [];

  for (const e of xp ?? []) events.push({ at: e.created_at, kind: "xp_event", title: `XP ${e.amount > 0 ? "+" : ""}${e.amount}`, detail: e.reason, tone: e.amount > 0 ? "accent" : "warning" });
  for (const c of coin ?? []) events.push({ at: c.created_at, kind: "coin_event", title: `Z-coin ${c.amount > 0 ? "+" : ""}${c.amount}`, detail: `${c.reason} (餘額 ${c.balance_after})`, tone: c.amount > 0 ? "accent" : "danger" });
  for (const l of lessons ?? []) events.push({ at: l.created_at, kind: "lesson_complete", title: `完成 lesson ${l.lesson_id}`, detail: `Ch ${l.chapter_id}` });
  for (const t of forumT ?? []) events.push({ at: t.created_at, kind: "forum_thread", title: "發新主題", detail: t.title });
  for (const r of forumR ?? []) events.push({ at: r.created_at, kind: "forum_reply", title: "論壇回覆", detail: (r.content ?? "").slice(0, 60) });
  for (const b of blogs ?? []) events.push({ at: b.created_at, kind: "blog_publish", title: b.is_public ? "發佈部落格" : "新增草稿", detail: b.title });
  for (const a of ach ?? []) events.push({ at: a.unlocked_at, kind: "achievement", title: "解鎖成就", detail: a.achievement_id, tone: "accent" });
  for (const b of bookmarks ?? []) events.push({ at: b.created_at, kind: "bookmark", title: "加入收藏", detail: b.lesson_title || b.lesson_id });
  for (const n of notes ?? []) events.push({ at: n.created_at, kind: "note_save", title: "寫筆記", detail: (n.content ?? "").slice(0, 60) });
  for (const s of sessions ?? []) events.push({ at: s.started_at, kind: "login_session", title: "登入 session", tone: "muted" });
  for (const q of quizzes ?? []) events.push({ at: q.attempted_at, kind: "quiz_attempt", title: `Quiz Ch${q.chapter_id} 答對 ${q.score}/${q.total_questions}`, tone: q.score === q.total_questions ? "accent" : "muted" });

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={adminHref(`/admin/users/${id}`) as any} className="text-sm text-fg-muted hover:text-accent flex items-center gap-1">
          <ArrowLeft size={14} /> 回 user 詳細頁
        </Link>
        <div className="text-xs text-fg-muted">近 30 天 · 共 {events.length} 條事件</div>
      </div>

      <PageHero
        emoji="🕐"
        title={`${profile.display_name || profile.username} 的活動時間軸`}
        desc="近 30 天用戶活動：登入、完成 lesson、發文、留言、購買…所有 admin_events 收集統一展示。"
        gradient="from-violet-500/10 via-purple-500/10 to-fuchsia-500/10"
        borderColor="border-violet-500/30"
      />

      {events.length === 0 ? (
        <div className="rounded-xl bg-bg-card border border-border p-12 text-center text-fg-muted">
          近 30 天無活動紀錄
        </div>
      ) : (
        <ol className="relative border-l-2 border-border pl-6 space-y-3">
          {events.map((e, i) => {
            const tone = e.tone === "accent" ? "text-accent" : e.tone === "warning" ? "text-warning" : e.tone === "danger" ? "text-red-400" : e.tone === "muted" ? "text-fg-muted" : "text-fg";
            return (
              <li key={i} className="relative">
                <span className={`absolute -left-[35px] top-1.5 w-4 h-4 rounded-full bg-bg-card border-2 ${e.tone === "accent" ? "border-accent" : "border-border"} flex items-center justify-center text-[8px]`}>
                  {KIND_ICON[e.kind] ?? "•"}
                </span>
                <div className="text-[10px] text-fg-muted">{formatTW(e.at)}</div>
                <div className={`text-sm font-medium ${tone}`}>{e.title}</div>
                {e.detail && <div className="text-xs text-fg-muted truncate">{e.detail}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
