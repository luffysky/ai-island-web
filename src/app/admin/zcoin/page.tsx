import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { PageHero } from "@/components/admin/PageHero";
import { Coins, ArrowLeft, ArrowRight } from "lucide-react";

const PAGE_SIZE = 100;

export default async function ZcoinPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const fromRow = (page - 1) * PAGE_SIZE;
  const supabase = createSupabaseAdmin();

  const { data: txs, count: txCount } = await supabase
    .from("coin_transactions")
    .select("*, profiles(username, display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(fromRow, fromRow + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((txCount ?? 0) / PAGE_SIZE));

  // 累計流通
  const { data: profiles } = await supabase
    .from("profiles")
    .select("z_coin");
  const totalCirculating = profiles?.reduce((s: number, p: any) => s + (p.z_coin ?? 0), 0) ?? 0;

  // 本月流入流出
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: monthTxs } = await supabase
    .from("coin_transactions")
    .select("amount, type:reason")
    .gte("created_at", startOfMonth);

  const inflow = monthTxs?.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0) ?? 0;
  const outflow = monthTxs?.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0) ?? 0;

  return (
    <div className="space-y-4">
      <PageHero
        icon={Coins}
        title="Z-coin 流水"
        desc="平台代幣即時統計：總流通量、本月發放/消耗。所有交易在 coin_transactions、可 audit。"
        gradient="from-yellow-500/10 via-amber-500/10 to-orange-500/10"
        borderColor="border-yellow-500/30"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="總流通量" value={totalCirculating.toLocaleString()} color="text-yellow-400" hint="所有 user 帳戶總和" />
        <Stat label="本月發放" value={`+${inflow.toLocaleString()}`} color="text-green-400" />
        <Stat label="本月消耗" value={`-${outflow.toLocaleString()}`} color="text-red-400" />
      </div>

      <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
            <tr>
              <th className="px-4 py-3">用戶</th>
              <th className="px-4 py-3">類型</th>
              <th className="px-4 py-3">金額</th>
              <th className="px-4 py-3">說明</th>
              <th className="px-4 py-3">時間</th>
            </tr>
          </thead>
          <tbody>
            {txs?.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-fg-muted">沒有交易紀錄</td></tr>
            ) : (
              txs?.map((t: any) => (
                <tr key={t.id} className="border-t border-border hover:bg-bg-elevated">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users?q=${t.profiles?.username}`} className="hover:text-accent">
                      {t.profiles?.display_name || t.profiles?.username || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-bg-elevated">{t.type}</span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${t.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {t.amount > 0 ? "+" : ""}{t.amount}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{t.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{new Date(t.created_at).toLocaleString('zh-TW')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link href={page > 1 ? (adminHref(`/admin/zcoin?page=${page - 1}`) as any) : "#"} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border ${page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}>
            <ArrowLeft className="w-4 h-4" /> 上一頁
          </Link>
          <span className="text-xs text-fg-muted px-3">{page} / {totalPages}（共 {(txCount ?? 0).toLocaleString()} 筆）</span>
          <Link href={page < totalPages ? (adminHref(`/admin/zcoin?page=${page + 1}`) as any) : "#"} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border ${page >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}>
            下一頁 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, hint }: { label: string; value: any; color: string; hint?: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      {hint && <div className="text-xs text-fg-muted mt-1">{hint}</div>}
    </div>
  );
}
