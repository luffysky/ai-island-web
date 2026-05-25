import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { GdprRequestsClient } from "./GdprRequestsClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminGdprPage() {
  const admin = createSupabaseAdmin();
  const { data: requests } = await admin
    .from("gdpr_requests")
    .select(`
      id, user_id, request_type, status, requested_at, completed_at,
      scheduled_hard_delete_at, meta,
      user:profiles!gdpr_requests_user_id_fkey(username, display_name, deleted_at)
    `)
    .order("requested_at", { ascending: false })
    .limit(200);

  // 統計
  const pending = (requests ?? []).filter((r: any) => r.status === "pending").length;
  const hardDeletable = (requests ?? []).filter(
    (r: any) =>
      r.request_type === "delete" &&
      r.status === "pending" &&
      r.scheduled_hard_delete_at &&
      new Date(r.scheduled_hard_delete_at) <= new Date(),
  ).length;

  return (
    <div>
      <PageHero
        emoji="🔐"
        title="GDPR 請求"
        desc="匯出 (Art.15) / 刪除 (Art.17) 請求佇列。軟刪後超過 7 天可手動硬刪。法規時程必須遵守。"
        gradient="from-slate-500/10 via-gray-500/10 to-zinc-500/10"
        borderColor="border-slate-500/30"
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-bg-card border border-border p-4">
          <div className="text-xs text-fg-muted">待處理</div>
          <div className="text-2xl font-bold mt-1 text-warning">{pending}</div>
        </div>
        <div className="rounded-xl bg-bg-card border border-border p-4">
          <div className="text-xs text-fg-muted">可硬刪</div>
          <div className="text-2xl font-bold mt-1 text-red-400">{hardDeletable}</div>
        </div>
        <div className="rounded-xl bg-bg-card border border-border p-4">
          <div className="text-xs text-fg-muted">總請求數</div>
          <div className="text-2xl font-bold mt-1">{requests?.length ?? 0}</div>
        </div>
      </div>

      <GdprRequestsClient initial={(requests ?? []) as any} />
    </div>
  );
}
