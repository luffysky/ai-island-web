import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { adminHref } from "@/lib/admin-href";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const [
    { data: xpEvents },
    { data: coinTxn },
    { data: achievements },
    { data: progress, count: progressCount },
    { data: quizAttempts, count: quizCount },
    { data: conversations },
    { data: bookmarks, count: bookmarkCount },
    { data: notes, count: noteCount },
    { data: playgrounds, count: playgroundCount },
    { data: orders },
    { data: subscriptions },
    { data: blogArticles, count: blogCount },
    { data: forumThreads, count: forumThreadCount },
    { data: forumReplies, count: forumReplyCount },
    { data: lastSession },
  ] = await Promise.all([
    admin.from("xp_events").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    admin.from("coin_transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    admin.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", id).order("unlocked_at", { ascending: false }),
    admin.from("lesson_progress").select("chapter_id, lesson_id, xp_awarded, created_at", { count: "exact" }).eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("quiz_attempts").select("*", { count: "exact", head: true }).eq("user_id", id),
    admin.from("ai_conversations").select("id, title, updated_at").eq("user_id", id).order("updated_at", { ascending: false }).limit(10),
    admin.from("bookmarks").select("*", { count: "exact" }).eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("notes").select("*", { count: "exact" }).eq("user_id", id).order("updated_at", { ascending: false }).limit(10),
    admin.from("playgrounds").select("*", { count: "exact", head: true }).eq("user_id", id),
    admin.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("subscriptions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(5),
    admin.from("user_blog_articles").select("id, title, slug, is_public, view_count, published_at", { count: "exact" }).eq("user_id", id).order("published_at", { ascending: false }).limit(10),
    admin.from("forum_threads").select("*", { count: "exact", head: true }).eq("user_id", id),
    admin.from("forum_replies").select("*", { count: "exact", head: true }).eq("user_id", id),
    admin.from("analytics_sessions").select("last_seen_at, current_path, city, country, district, device_type").eq("user_id", id).order("last_seen_at", { ascending: false }).limit(1).maybeSingle(),
  ] as any);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={adminHref("/admin/users") as any}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={14} /> 回使用者列表
        </Link>
      </div>

      {/* Profile header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 flex items-center gap-4">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={64}
            height={64}
            unoptimized
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] flex items-center justify-center text-2xl font-bold text-white">
            {(profile.display_name || profile.username || "?")[0]}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              profile.role === "admin"
                ? "bg-red-500/20 text-red-500"
                : profile.role === "editor"
                ? "bg-blue-500/20 text-blue-500"
                : "bg-gray-500/20 text-gray-500"
            }`}>{profile.role}</span>
            {profile.ai_unlimited && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500">✨ AI 特權</span>
            )}
            {profile.banned_at && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-600/30 text-red-400">🚫 BANNED</span>
            )}
          </div>
          <div className="text-xs text-[var(--color-fg-muted)] mt-0.5">
            @{profile.username} · {profile.id}
          </div>
          <div className="text-xs text-[var(--color-fg-muted)]">
            建立於 {new Date(profile.created_at).toLocaleDateString("zh-TW")}
            {profile.last_active_at && ` · 最後活躍 ${new Date(profile.last_active_at).toLocaleString("zh-TW")}`}
          </div>
          {lastSession?.current_path && (
            <div className="text-[11px] text-[var(--color-fg-muted)] mt-1">
              最後足跡：{lastSession.current_path} · {[lastSession.country, lastSession.city, lastSession.district].filter(Boolean).join(" / ")} · {lastSession.device_type}
            </div>
          )}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Level" value={`Lv ${profile.level ?? 1}`} hint={`${(profile.xp ?? 0).toLocaleString()} XP`} />
        <Stat label="Z-coin" value={profile.z_coin ?? 0} />
        <Stat label="連勝" value={`🔥 ${profile.streak_days ?? 0}`} />
        <Stat label="生命" value={`❤️ ${profile.hearts ?? 5}`} />
        <Stat label="完成 lesson" value={progressCount ?? 0} />
        <Stat label="Quiz 嘗試" value={quizCount ?? 0} />
        <Stat label="書籤" value={bookmarkCount ?? 0} />
        <Stat label="筆記" value={noteCount ?? 0} />
        <Stat label="Playground" value={playgroundCount ?? 0} />
        <Stat label="部落格文章" value={blogCount ?? 0} />
        <Stat label="論壇主題" value={forumThreadCount ?? 0} />
        <Stat label="論壇回覆" value={forumReplyCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="近期 XP 事件" empty="無 XP 紀錄">
          {(xpEvents ?? []).map((e: any) => (
            <Row
              key={e.id}
              left={`${e.amount > 0 ? "+" : ""}${e.amount}`}
              leftClass={e.amount > 0 ? "text-green-400" : "text-red-400"}
              mid={e.reason || "—"}
              right={new Date(e.created_at).toLocaleString("zh-TW")}
            />
          ))}
        </Panel>
        <Panel title="近期 Z-coin 流水" empty="無 Z-coin 紀錄">
          {(coinTxn ?? []).map((e: any) => (
            <Row
              key={e.id}
              left={`${e.amount > 0 ? "+" : ""}${e.amount}`}
              leftClass={e.amount > 0 ? "text-yellow-400" : "text-red-400"}
              mid={`${e.type} · ${e.reason || ""}`}
              right={new Date(e.created_at).toLocaleString("zh-TW")}
            />
          ))}
        </Panel>
        <Panel title="近期 lesson 完成" empty="無 lesson 紀錄">
          {(progress ?? []).map((p: any, i: number) => (
            <Row
              key={i}
              left={`Ch ${String(p.chapter_id).padStart(2, "0")}`}
              mid={p.lesson_id}
              right={new Date(p.created_at).toLocaleString("zh-TW")}
            />
          ))}
        </Panel>
        <Panel title="解鎖成就" empty="無成就">
          {(achievements ?? []).map((a: any, i: number) => (
            <Row
              key={i}
              left="🏆"
              mid={a.achievement_id}
              right={new Date(a.unlocked_at).toLocaleDateString("zh-TW")}
            />
          ))}
        </Panel>
        <Panel title="AI 對話紀錄" empty="無對話">
          {(conversations ?? []).map((c: any) => (
            <Row
              key={c.id}
              left="💬"
              mid={c.title || "(無標題)"}
              right={new Date(c.updated_at).toLocaleDateString("zh-TW")}
            />
          ))}
        </Panel>
        <Panel title="近期筆記" empty="無筆記">
          {(notes ?? []).map((n: any) => (
            <Row
              key={n.id}
              left="📝"
              mid={(n.content || "").slice(0, 50)}
              right={new Date(n.updated_at).toLocaleDateString("zh-TW")}
            />
          ))}
        </Panel>
        <Panel title="部落格文章" empty="尚未寫文">
          {(blogArticles ?? []).map((b: any) => (
            <Row
              key={b.id}
              left={b.is_public ? "🌐" : "🔒"}
              mid={b.title}
              right={`${b.view_count ?? 0} views`}
            />
          ))}
        </Panel>
        <Panel title="訂單" empty="無訂單">
          {(orders ?? []).map((o: any) => (
            <Row
              key={o.id}
              left={`NT$ ${o.amount}`}
              leftClass={o.status === "paid" ? "text-green-400" : "text-orange-400"}
              mid={o.product_name || o.order_no}
              right={new Date(o.created_at).toLocaleDateString("zh-TW")}
            />
          ))}
        </Panel>
        <Panel title="訂閱" empty="無訂閱">
          {(subscriptions ?? []).map((s: any) => (
            <Row
              key={s.id}
              left={s.status}
              mid={s.plan_name || `NT$ ${s.plan_price}`}
              right={s.expires_at ? new Date(s.expires_at).toLocaleDateString("zh-TW") : "—"}
            />
          ))}
        </Panel>
        <Panel title="書籤" empty="無書籤">
          {(bookmarks ?? []).map((b: any) => (
            <Row
              key={b.id}
              left={`Ch ${b.chapter_id}`}
              mid={b.lesson_title || b.lesson_id}
              right={new Date(b.created_at).toLocaleDateString("zh-TW")}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
      <div className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-[var(--color-fg-muted)] mt-0.5">{hint}</div>}
    </div>
  );
}

function Panel({ title, children, empty }: { title: string; children: React.ReactNode; empty: string }) {
  const arr = Array.isArray(children) ? children : [children];
  const filtered = arr.filter(Boolean);
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <h3 className="text-sm font-bold mb-2">{title}</h3>
      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--color-fg-muted)] py-4 text-center">{empty}</p>
      ) : (
        <div className="space-y-0.5">{children}</div>
      )}
    </div>
  );
}

function Row({
  left,
  leftClass,
  mid,
  right,
}: {
  left: React.ReactNode;
  leftClass?: string;
  mid: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs py-1.5 border-t border-[var(--color-border)] first:border-t-0">
      <span className={`flex-shrink-0 font-bold ${leftClass ?? ""}`}>{left}</span>
      <span className="flex-1 truncate text-[var(--color-fg)]">{mid}</span>
      <span className="flex-shrink-0 text-[var(--color-fg-muted)] text-[10px]">{right}</span>
    </div>
  );
}
