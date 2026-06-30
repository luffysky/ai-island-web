import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/admin/PageHero";
import { Send, AlertTriangle } from "lucide-react";

export default async function BroadcastsPage() {
  const supabase = createSupabaseAdmin();

  const { data: broadcasts, error } = await supabase
    .from("broadcasts")
    .select("*, profiles(username)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="📣"
        title="公告 / 群發訊息"
        desc="站內公告 + Email 群發。發出去後所有用戶 in-app bell 跟 newsletter 都會收到。"
        gradient="from-rose-500/10 via-pink-500/10 to-fuchsia-500/10"
        borderColor="border-rose-500/30"
      >
        <Link href={`/${process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2"}/admin/broadcasts/new` as any} className="px-3 py-1.5 bg-accent text-black rounded-full font-bold text-xs hover:scale-105 transition-transform">
          + 新建
        </Link>
      </PageHero>

      {error?.message?.includes("does not exist") ? (
        <SchemaNeeded />
      ) : broadcasts?.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl">
          <EmptyState
            emoji="📣"
            title="還沒發過任何公告"
            desc="支援站內訊息 / Email / LINE / Push Notification、點右上「+ 新建」開始"
            action={{ label: "+ 新建公告", href: `/${process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2"}/admin/broadcasts/new` }}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts?.map((b: any) => (
            <div key={b.id} className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{b.title}</h3>
                    <ChannelBadge channel={b.channel} />
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-fg-muted line-clamp-2">{b.content}</p>
                </div>
                <div className="text-right text-xs text-fg-muted shrink-0">
                  {b.sent_at && <div className="flex items-center gap-2 justify-end"><Send className="w-4 h-4" /> {new Date(b.sent_at).toLocaleDateString('zh-TW')}</div>}
                  {b.sent_count > 0 && (
                    <div className="mt-1">
                      送達 {b.sent_count} · 開啟 {b.open_count} · 點擊 {b.click_count}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const labels: Record<string, string> = { in_app: "📱 站內", email: "📧 Email", line: "💚 LINE", push: "🔔 Push" };
  return <span className="text-xs px-2 py-0.5 rounded bg-bg-elevated">{labels[channel] ?? channel}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-900 dark:text-gray-200",
    scheduled: "bg-blue-500/20 text-blue-900 dark:text-blue-200",
    sending: "bg-yellow-500/20 text-yellow-900 dark:text-yellow-200",
    sent: "bg-green-500/20 text-green-900 dark:text-green-200",
    failed: "bg-red-500/20 text-red-900 dark:text-red-200",
  };
  const labels: Record<string, string> = { draft: "草稿", scheduled: "排程中", sending: "傳送中", sent: "已送出", failed: "失敗" };
  return <span className={`text-xs px-2 py-0.5 rounded ${colors[status]}`}>{labels[status] ?? status}</span>;
}

function SchemaNeeded() {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
      <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 需要先跑 admin migration</div>
      <code className="block bg-bg p-3 rounded text-xs">supabase/admin_migration.sql</code>
    </div>
  );
}
