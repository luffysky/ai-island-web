import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ModerationClient } from "./ModerationClient";

export const dynamic = "force-dynamic";

export default async function AdminAIModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "pending";
  const severity = sp.severity ?? "";

  const admin = createSupabaseAdmin();
  let q = admin
    .from("ai_moderation_flags")
    .select(`
      id, role, content_snippet, flag_reason, severity, status, created_at, meta,
      message_id, conversation_id,
      user:profiles!ai_moderation_flags_user_id_fkey(username, display_name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && status !== "all") q = q.eq("status", status);
  if (severity) q = q.eq("severity", severity);

  const { data, count } = await q;

  const [{ count: pendingCount }, { count: criticalCount }] = await Promise.all([
    admin.from("ai_moderation_flags").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("ai_moderation_flags").select("*", { count: "exact", head: true }).in("severity", ["high", "critical"]).eq("status", "pending"),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🛡️ AI 對話審核</h1>
        <p className="text-sm text-fg-muted mt-1">
          AI / 使用者訊息被 flag 後待處理。可由 keyword / user_report / classifier / manual 觸發。
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="待處理" value={pendingCount ?? 0} tone="warning" />
        <Stat label="高危待處理" value={criticalCount ?? 0} tone="danger" />
        <Stat label="目前篩選" value={count ?? 0} tone="muted" />
      </div>

      <ModerationClient initial={(data ?? []) as any} filters={{ status, severity }} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" | "muted" }) {
  const color = tone === "warning" ? "text-warning" : tone === "danger" ? "text-red-400" : tone === "muted" ? "text-fg-muted" : "text-accent";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}
