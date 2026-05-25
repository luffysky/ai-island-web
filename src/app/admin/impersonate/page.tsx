import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { formatTW } from "@/lib/format-date";
import { ImpersonateForm } from "./ImpersonateForm";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function ImpersonateLogPage() {
  const admin = createSupabaseAdmin();
  const { data: rows } = await admin
    .from("admin_impersonations")
    .select(`
      id, reason, started_at, ended_at, ip_hash,
      admin:profiles!admin_impersonations_admin_id_fkey(username, display_name),
      target:profiles!admin_impersonations_target_user_id_fkey(id, username, display_name)
    `)
    .order("started_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHero
        emoji="🕵️"
        title="Impersonate 紀錄"
        desc="以使用者身份檢視 (read-only)。所有 session 都會紀錄、被 impersonate 的人也能看見。客服 debug 用。"
        gradient="from-fuchsia-500/10 via-purple-500/10 to-indigo-500/10"
        borderColor="border-fuchsia-500/30"
      />

      <ImpersonateForm />

      <div className="rounded-xl bg-bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-bg-elevated text-fg-muted text-xs">
            <tr>
              <th className="text-left px-3 py-2">Admin</th>
              <th className="text-left px-3 py-2">Target</th>
              <th className="text-left px-3 py-2">理由</th>
              <th className="text-left px-3 py-2">開始</th>
              <th className="text-left px-3 py-2">結束</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-fg-muted text-sm">尚無 impersonate 紀錄</td>
              </tr>
            ) : (
              rows!.map((r: any) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.admin?.display_name || r.admin?.username || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.target?.display_name || r.target?.username || r.target?.id?.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 text-xs text-fg-muted italic truncate max-w-xs">「{r.reason}」</td>
                  <td className="px-3 py-2 text-xs">{formatTW(r.started_at)}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.ended_at ? formatTW(r.ended_at) : <span className="text-yellow-500">進行中</span>}
                  </td>
                  <td className="px-3 py-2">
                    {r.target?.id && (
                      <Link
                        href={`/admin/impersonate/${r.target.id}` as any}
                        className="text-xs text-accent hover:underline"
                      >
                        檢視 →
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
