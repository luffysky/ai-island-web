import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { TicketsClient } from "./TicketsClient";

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
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🎫 客訴工單</h1>
        <p className="text-sm text-fg-muted mt-1">使用者透過 /me/support 提的工單。</p>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="未處理" value={openCount ?? 0} tone="warning" />
        <Stat label="緊急未處理" value={urgentOpen ?? 0} tone="danger" />
        <Stat label="目前篩選" value={count ?? 0} />
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
