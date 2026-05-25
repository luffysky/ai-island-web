import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { TicketsClient } from "./TicketsClient";
import { PageHero, AdminStatCard } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "open";

  const admin = createSupabaseAdmin();
  let q = admin
    .from("tickets")
    .select(`
      id, subject, body, category, priority, status, created_at, updated_at, resolved_at,
      user:profiles!tickets_user_id_fkey(username, display_name, email),
      assignee:profiles!tickets_assigned_to_fkey(username, display_name)
    `, { count: "exact" })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") q = q.eq("status", status);
  if (sp.priority) q = q.eq("priority", sp.priority);
  if (sp.category) q = q.eq("category", sp.category);

  const { data, count } = await q;

  const [{ count: openCount }, { count: urgentOpen }] = await Promise.all([
    admin.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    admin.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open").eq("priority", "urgent"),
  ]);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🎫"
        title="客訴工單"
        desc="使用者透過 /me/support + LINE bot 提交的工單、可分配 / 回覆 / 結案。"
        gradient="from-cyan-500/10 via-blue-500/10 to-purple-500/10"
        borderColor="border-cyan-500/30"
      />

      <div className="grid grid-cols-3 gap-3">
        <AdminStatCard label="未處理" value={(openCount ?? 0).toLocaleString()} color="text-orange-400" hint={openCount && openCount > 10 ? "⚠️ 偏多" : undefined} />
        <AdminStatCard label="緊急未處理" value={(urgentOpen ?? 0).toLocaleString()} color="text-red-400" hint={urgentOpen && urgentOpen > 0 ? "🔥 馬上處理" : undefined} />
        <AdminStatCard label="目前篩選" value={(count ?? 0).toLocaleString()} color="text-accent" />
      </div>

      <TicketsClient
        initial={(data ?? []) as any}
        filterStatus={status}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" }) {
  const color = tone === "warning" ? "text-warning" : tone === "danger" ? "text-red-400" : "text-accent";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}
