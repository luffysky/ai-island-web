import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { Banknote } from "lucide-react";
import { AdminPayoutsClient } from "./AdminPayoutsClient";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const admin = createSupabaseAdmin();
  const { data: payouts } = await admin.from("ci_payouts").select("*").order("requested_at", { ascending: false }).limit(200);
  const userIds = [...new Set(((payouts ?? []) as any[]).map((p) => p.user_id))];
  const { data: profiles } = await admin.from("profiles").select("id, username, display_name").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const nameMap = new Map<string, string>();
  for (const p of (profiles ?? []) as any[]) nameMap.set(p.id, p.display_name || p.username || p.id.slice(0, 8));
  const rows = ((payouts ?? []) as any[]).map((p) => ({ ...p, _name: nameMap.get(p.user_id) ?? p.user_id.slice(0, 8) }));
  const pending = rows.filter((r) => r.status === "pending" || r.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHero
        icon={Banknote}
        title="創作者提現對帳"
        desc="創作者用果實申請提現（申請當下已扣住果實）。你依帳號人工撥款後標記「已撥款」；不核准就「駁回」（果實自動退回）。"
        gradient="from-emerald-500/10 via-teal-500/10 to-green-500/10"
        borderColor="border-emerald-500/30"
      />
      <AdminPayoutsClient rows={rows as any} pendingCount={pending} />
    </div>
  );
}
