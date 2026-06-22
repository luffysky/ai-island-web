import { createSupabaseServer } from "@/lib/supabase-server";
import { ledgerLabel } from "@/lib/ledger-labels";
import { formatTW } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function MyLedgerPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: prof }, { data: xp }, { data: coin }] = await Promise.all([
    supabase.from("profiles").select("xp, level, z_coin").eq("id", user.id).maybeSingle(),
    supabase.from("xp_events").select("amount, reason, meta, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(120),
    supabase.from("coin_transactions").select("amount, reason, meta, balance_after, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(120),
  ] as any);

  const p = prof as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">🪙 Z幣 / 經驗明細</h1>
        <p className="text-sm text-fg-muted mt-1">你的每一筆經驗值與 Z幣是怎麼來的、花到哪去，全部記在這。</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-fg-muted">等級</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">Lv {p?.level ?? 1}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-fg-muted">總經驗 XP</div>
          <div className="text-2xl font-bold text-accent mt-1">{(p?.xp ?? 0).toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-fg-muted">Z幣餘額</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">🪙 {(p?.z_coin ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Ledger title="📈 經驗（XP）明細" rows={(xp as any[]) ?? []} positiveClass="text-green-400" />
        <Ledger title="🪙 Z幣明細" rows={(coin as any[]) ?? []} positiveClass="text-yellow-400" showBalance />
      </div>
    </div>
  );
}

function Ledger({ title, rows, positiveClass, showBalance }: {
  title: string; rows: any[]; positiveClass: string; showBalance?: boolean;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h2 className="font-bold mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-fg-muted py-6 text-center">還沒有紀錄。</p>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          {rows.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm py-2 border-t border-border first:border-t-0">
              <span className={`shrink-0 font-bold tabular-nums w-12 ${e.amount > 0 ? positiveClass : "text-red-400"}`}>
                {e.amount > 0 ? "+" : ""}{e.amount}
              </span>
              <span className="flex-1 truncate text-fg">{ledgerLabel(e.reason, e.meta)}</span>
              <span className="shrink-0 text-fg-muted text-[10px] text-right">
                {showBalance && e.balance_after != null && <span className="block">餘 {e.balance_after}</span>}
                {formatTW(e.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
