import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { adminListAllThreads, adminThreadMessages } from "@/lib/creator-engine/dm";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

const nm = (p: any) => p?.display_name || p?.username || "—";

export default async function AdminDMPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect("/admin");
  if (!gate.isOwner) {
    return <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-sm">🔒 私訊紀錄僅限站長（owner）檢視。</div>;
  }

  const { t } = await searchParams;
  const threads = await adminListAllThreads();
  const messages = t ? await adminThreadMessages(t) : [];

  // 稽核：站長檢視私訊（敏感操作留痕）
  if (t) {
    const admin = createSupabaseAdmin();
    await admin.from("audit_logs").insert({
      actor_id: gate.userId, actor_username: gate.username, action: "admin.view_dm_thread",
      target_type: "ci_dm_thread", target_id: t,
    }).then(() => {}, () => {});
  }

  return (
    <div className="space-y-6">
      <PageHero emoji="🔒" title="私訊紀錄（站長監看）" desc="所有使用者私訊完整內容（含圖/影/音/檔案）。僅 owner 可見；每次檢視會留稽核紀錄。"
        gradient="from-red-500/10 via-rose-500/10 to-pink-500/10" borderColor="border-red-500/30" />

      <div className="grid sm:grid-cols-[260px_1fr] gap-3">
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {threads.length === 0 && <div className="text-xs text-fg-muted p-3">尚無對話。</div>}
          {(threads as any[]).map((th) => (
            <Link key={th.id} href={`/admin/creator-island/messages?t=${th.id}`}
              className={`block p-2 rounded-lg text-sm ${t === th.id ? "bg-accent/15" : "bg-bg-card hover:bg-bg-elevated"}`}>
              <div className="font-medium">{nm(th.lo)} ↔ {nm(th.hi)}</div>
              <div className="text-[10px] text-fg-muted">{th.last_message_at ? new Date(th.last_message_at).toLocaleString("zh-TW") : "（無訊息）"}</div>
            </Link>
          ))}
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-4 min-h-[60vh]">
          {!t && <div className="grid place-items-center h-full text-sm text-fg-muted">選一個對話檢視完整紀錄</div>}
          {t && (
            <div className="space-y-2">
              {(messages as any[]).length === 0 && <div className="text-sm text-fg-muted">此對話沒有訊息。</div>}
              {(messages as any[]).map((m) => (
                <div key={m.id} className="bg-bg-elevated rounded-lg px-3 py-2 text-sm">
                  <div className="text-[11px] text-fg-muted mb-0.5">{nm(m.sender)} · {new Date(m.created_at).toLocaleString("zh-TW")}</div>
                  {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                  {m.media_url && m.media_type === "image" && <img src={m.media_url} className="rounded mt-1 max-h-60" />}
                  {m.media_url && m.media_type === "video" && <video src={m.media_url} controls className="rounded mt-1 max-h-60" />}
                  {m.media_url && m.media_type === "audio" && <audio src={m.media_url} controls className="mt-1 w-full" />}
                  {m.media_url && !["image", "video", "audio"].includes(m.media_type) && <a href={m.media_url} target="_blank" className="underline text-xs">附件檔</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
