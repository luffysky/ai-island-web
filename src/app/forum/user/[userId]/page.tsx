import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase";
import { MessageSquare, FileText, Award, Eye, Star, ArrowLeft } from "lucide-react";
import type { ForumReply } from "@/lib/forum-types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

async function getUserActivity(userId: string) {
  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, xp")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const { data: threads } = await admin
    .from("forum_threads")
    .select(`id, title, reply_count, view_count, is_featured, created_at,
      board:forum_boards!forum_threads_board_id_fkey(name, slug, emoji)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: replies } = await admin
    .from("forum_replies")
    .select(`id, content, is_answer, created_at, thread_id,
      thread:forum_threads!forum_replies_thread_id_fkey(id, title)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  const { count: tc } = await admin.from("forum_threads")
    .select("id", { count: "exact", head: true }).eq("user_id", userId);
  const { count: rc } = await admin.from("forum_replies")
    .select("id", { count: "exact", head: true }).eq("user_id", userId);
  const { count: ac } = await admin.from("forum_replies")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_answer", true);

  return {
    profile,
    threads: threads ?? [],
    replies: (replies ?? []) as any[],
    stats: { threads: tc ?? 0, replies: rc ?? 0, answers: ac ?? 0 },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const data = await getUserActivity(userId);
  if (!data) return { title: "找不到用戶 | AI 島" };
  const name = data.profile.display_name || data.profile.username;
  return {
    title: `${name} 的討論區活動 | AI 島`,
    alternates: { canonical: `${SITE_URL}/forum/user/${userId}` },
  };
}

export default async function ForumUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const data = await getUserActivity(userId);
  if (!data) notFound();

  const { profile, threads, replies, stats } = data;
  const name = profile.display_name || profile.username || "用戶";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/forum" className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> 討論區
      </Link>

      {/* 用戶 Header */}
      <div className="flex items-center gap-4 mb-6">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] flex items-center justify-center text-2xl font-bold text-black">
            {name[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {name}
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] font-bold">
              Lv {profile.level ?? 1}
            </span>
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)]">{profile.xp ?? 0} XP</p>
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat icon={<FileText size={16} />} label="發表主題" value={stats.threads} />
        <Stat icon={<MessageSquare size={16} />} label="回覆" value={stats.replies} />
        <Stat icon={<Award size={16} />} label="被採納解答" value={stats.answers} />
      </div>

      {/* 發表的主題 */}
      <section className="mb-8">
        <h2 className="font-bold mb-3">發表的主題</h2>
        {threads.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">還沒有發表主題</p>
        ) : (
          <div className="space-y-2">
            {threads.map((t: any) => (
              <Link
                key={t.id}
                href={`/forum/thread/${t.id}`}
                className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 hover:border-[var(--color-accent)] transition"
              >
                <div className="flex items-center gap-1.5">
                  {t.is_featured && <Star size={12} className="text-yellow-400" />}
                  <h3 className="font-semibold text-sm">{t.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--color-fg-muted)] mt-1">
                  {t.board && <span>{t.board.emoji} {t.board.name}</span>}
                  <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {t.reply_count}</span>
                  <span className="flex items-center gap-0.5"><Eye size={10} /> {t.view_count}</span>
                  <span>{new Date(t.created_at).toLocaleDateString("zh-TW")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 回覆過的 */}
      <section>
        <h2 className="font-bold mb-3">最近的回覆</h2>
        {replies.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">還沒有回覆</p>
        ) : (
          <div className="space-y-2">
            {replies.map((r: any) => (
              <Link
                key={r.id}
                href={`/forum/thread/${r.thread_id}`}
                className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 hover:border-[var(--color-accent)] transition"
              >
                {r.is_answer && (
                  <span className="text-[10px] text-[var(--color-accent)] font-bold">✓ 已採納為解答</span>
                )}
                <p className="text-sm line-clamp-2">{r.content}</p>
                <p className="text-[11px] text-[var(--color-fg-muted)] mt-1">
                  回覆於「{r.thread?.title ?? "（已刪除）"}」· {new Date(r.created_at).toLocaleDateString("zh-TW")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-center">
      <div className="flex justify-center text-[var(--color-accent)] mb-1">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-[var(--color-fg-muted)]">{label}</div>
    </div>
  );
}
