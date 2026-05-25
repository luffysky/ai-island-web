import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function AffiliatesPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("affiliate_codes")
    .select("*")
    .eq("enabled", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data as any[]) ?? [];
  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
  const totalCommission = rows.reduce((s, r) => s + Number(r.commission_paid ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">🤝 推薦碼 / Affiliate</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          KOL / 員工 / 學員 推薦碼系統。每個碼可獨立設折扣 % 跟佣金 %、追蹤點擊 / 轉換 / 收益 / 已付佣金。
          建表 + RLS 已就緒、UI CRUD 排下輪迭代。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-fg-muted">有效推薦碼</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-fg-muted">累積帶來營收</div>
          <div className="text-2xl font-bold">NT$ {totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-fg-muted">已付佣金</div>
          <div className="text-2xl font-bold">NT$ {totalCommission.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-bg-elevated text-[10px] font-bold text-fg-muted border-b border-border">
          <div className="col-span-2">代碼</div>
          <div className="col-span-3">推薦人</div>
          <div className="col-span-2 text-center">折扣 / 佣金</div>
          <div className="col-span-2 text-right">點擊 / 轉換</div>
          <div className="col-span-3 text-right">營收 / 佣金</div>
        </div>
        {rows.length === 0 && <div className="p-4 text-center text-fg-muted text-xs">還沒有推薦碼</div>}
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border last:border-0 text-xs">
            <div className="col-span-2 font-mono text-purple-300">{r.code}</div>
            <div className="col-span-3 truncate">{r.owner_name ?? "-"}</div>
            <div className="col-span-2 text-center text-fg-muted">{r.discount_pct}% / {r.commission_pct}%</div>
            <div className="col-span-2 text-right">{r.click_count} / {r.conversion}</div>
            <div className="col-span-3 text-right text-fg-muted">NT$ {Number(r.revenue).toLocaleString()} / {Number(r.commission_paid).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
