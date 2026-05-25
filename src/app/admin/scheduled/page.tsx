import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { formatTW } from "@/lib/format-date";
import { adminHref } from "@/lib/admin-href";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminScheduledPage() {
  const admin = createSupabaseAdmin();

  const now = new Date().toISOString();

  // 各表的 scheduled 內容
  const [
    { data: chapters },
    { data: blogs },
    { data: campaigns },
    { data: broadcasts },
  ] = await Promise.all([
    admin.from("chapters").select("id, title, scheduled_publish_at, status").not("scheduled_publish_at", "is", null).order("scheduled_publish_at"),
    admin.from("user_blog_articles").select("id, title, scheduled_publish_at, is_public, user_id").not("scheduled_publish_at", "is", null).order("scheduled_publish_at"),
    admin.from("email_campaigns").select("id, subject, scheduled_at, status").eq("status", "scheduled").order("scheduled_at"),
    admin.from("broadcasts").select("id, title, scheduled_at, status").eq("status", "scheduled").order("scheduled_at"),
  ]);

  const isDue = (t?: string | null): boolean => !!(t && new Date(t) <= new Date());

  return (
    <div className="space-y-6">
      <PageHero
        emoji="⏰"
        title="排程發布隊列"
        desc="所有「未來會自動上線」的內容。cron job 每分鐘掃到期項目觸發 publish。"
        gradient="from-cyan-500/10 via-teal-500/10 to-emerald-500/10"
        borderColor="border-cyan-500/30"
      />

      <Section title="章節（chapters）">
        {(chapters ?? []).length === 0 ? <Empty /> : (chapters ?? []).map((c: any) => (
          <Row
            key={c.id}
            link={adminHref(`/admin/chapters/${c.id}`)}
            label={`Ch ${c.id} · ${c.title}`}
            time={c.scheduled_publish_at}
            due={isDue(c.scheduled_publish_at)}
            extra={`狀態：${c.status}`}
          />
        ))}
      </Section>

      <Section title="部落格文章">
        {(blogs ?? []).length === 0 ? <Empty /> : (blogs ?? []).map((b: any) => (
          <Row
            key={b.id}
            label={b.title}
            time={b.scheduled_publish_at}
            due={isDue(b.scheduled_publish_at)}
            extra={b.is_public ? "已公開" : "草稿"}
          />
        ))}
      </Section>

      <Section title="Email campaigns">
        {(campaigns ?? []).length === 0 ? <Empty /> : (campaigns ?? []).map((e: any) => (
          <Row
            key={e.id}
            link={adminHref("/admin/email/campaigns")}
            label={e.subject}
            time={e.scheduled_at}
            due={isDue(e.scheduled_at)}
          />
        ))}
      </Section>

      <Section title="站內公告（broadcasts）">
        {(broadcasts ?? []).length === 0 ? <Empty /> : (broadcasts ?? []).map((b: any) => (
          <Row
            key={b.id}
            link={adminHref(`/admin/broadcasts/${b.id}`)}
            label={b.title}
            time={b.scheduled_at}
            due={isDue(b.scheduled_at)}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-bg-card border border-border">
      <div className="px-4 py-2 border-b border-border text-sm font-bold">{title}</div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}
function Empty() { return <div className="text-center py-6 text-fg-muted text-xs">無排程</div>; }

function Row({ label, time, due, extra, link }: { label: string; time: string | null; due: boolean | null | undefined; extra?: string; link?: string }) {
  const Inner = (
    <div className="px-4 py-2 flex items-center gap-3">
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${due ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"}`}>
        {due ? "可發布" : "排程中"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        {extra && <div className="text-[10px] text-fg-muted">{extra}</div>}
      </div>
      <div className="text-xs text-fg-muted shrink-0">{time ? formatTW(time) : "—"}</div>
    </div>
  );
  return link ? <Link href={link as any} className="block hover:bg-bg-elevated transition">{Inner}</Link> : Inner;
}
