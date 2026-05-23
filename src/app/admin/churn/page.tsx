import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { scoreRfm, SEGMENT_LABEL, SEGMENT_COLOR, type RfmSegment } from "@/lib/rfm";
import { ChurnClient } from "./ChurnClient";

export const dynamic = "force-dynamic";

const TARGET_SEGMENTS: RfmSegment[] = ["at_risk", "cant_lose", "hibernating", "lost"];

export default async function AdminChurnPage({
  searchParams,
}: {
  searchParams: Promise<{ seg?: string; min_xp?: string }>;
}) {
  const sp = await searchParams;
  const segFilter = (sp.seg ?? "all") as RfmSegment | "all";
  const minXp = Math.max(0, parseInt(sp.min_xp ?? "100", 10) || 100);

  const admin = createSupabaseAdmin();

  // 撈 candidates：xp >= minXp 且未被封禁
  const { data: candidates } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, xp, level, z_coin, streak_days, last_active_at, created_at")
    .gte("xp", minXp)
    .is("banned_at", null)
    .order("xp", { ascending: false })
    .limit(2000);

  const ids = (candidates ?? []).map((u: any) => u.id);

  // 90 天活躍日數（從 lesson_progress 日期 distinct）+ monetary（z 幣消費 + orders 付款）
  const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
  const [{ data: events }, { data: orders }, { data: zcoinSpend }] = await Promise.all([
    ids.length === 0 ? { data: [] as any[] } : admin
      .from("lesson_progress")
      .select("user_id, completed_at")
      .in("user_id", ids)
      .gte("completed_at", since90),
    ids.length === 0 ? { data: [] as any[] } : admin
      .from("orders")
      .select("user_id, amount_twd")
      .in("user_id", ids)
      .eq("status", "paid"),
    ids.length === 0 ? { data: [] as any[] } : admin
      .from("zcoin_ledger")
      .select("user_id, amount")
      .in("user_id", ids)
      .lt("amount", 0),
  ] as any);

  const frequency = new Map<string, Set<string>>();
  for (const e of (events as any[]) ?? []) {
    const day = String(e.completed_at).slice(0, 10);
    if (!frequency.has(e.user_id)) frequency.set(e.user_id, new Set());
    frequency.get(e.user_id)!.add(day);
  }
  const monetary = new Map<string, number>();
  for (const o of (orders as any[]) ?? []) {
    monetary.set(o.user_id, (monetary.get(o.user_id) ?? 0) + Number(o.amount_twd ?? 0));
  }
  for (const z of (zcoinSpend as any[]) ?? []) {
    monetary.set(z.user_id, (monetary.get(z.user_id) ?? 0) + Math.abs(Number(z.amount ?? 0)) * 0.1); // z 幣以 0.1 元計
  }

  const now = Date.now();
  const inputs = (candidates ?? []).map((u: any) => ({
    user_id: u.id,
    recencyDays: u.last_active_at ? Math.floor((now - new Date(u.last_active_at).getTime()) / 86400_000) : null,
    frequency90: (frequency.get(u.id)?.size) ?? 0,
    monetary: monetary.get(u.id) ?? 0,
  }));

  const scored = scoreRfm(inputs);
  const byId = new Map(scored.map((s) => [s.user_id, s]));

  // segment 計數（給 top stat cards）
  const segCounts: Record<string, number> = {};
  for (const s of scored) {
    segCounts[s.segment] = (segCounts[s.segment] ?? 0) + 1;
  }

  // 套用 filter
  const rows = (candidates ?? [])
    .map((u: any) => {
      const r = byId.get(u.id);
      if (!r) return null;
      return { ...u, ...r };
    })
    .filter(Boolean)
    .filter((u: any) => segFilter === "all" ? TARGET_SEGMENTS.includes(u.segment) : u.segment === segFilter)
    .sort((a: any, b: any) => b.churnRisk - a.churnRisk || b.monetary - a.monetary)
    .slice(0, 300);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🚨 RFM 流失預警</h1>
        <p className="text-sm text-fg-muted mt-1">
          Recency × Frequency × Monetary 三維評分（每維 1-5 分）、自動分 8 個 segment。
          預設聚焦四個高風險 segment：at_risk / cant_lose / hibernating / lost。
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(Object.keys(SEGMENT_LABEL) as RfmSegment[]).map((seg) => {
          const active = segFilter === seg;
          return (
            <a key={seg} href={`?seg=${seg}&min_xp=${minXp}`} className="block">
              <div className={`rounded-xl bg-bg-card border ${active ? "border-accent" : "border-border"} p-3 hover:border-accent transition`}>
                <div className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-bold ${SEGMENT_COLOR[seg]}`}>{SEGMENT_LABEL[seg]}</div>
                <div className="text-2xl font-bold mt-1">{(segCounts[seg] ?? 0).toLocaleString()}</div>
              </div>
            </a>
          );
        })}
      </div>

      <div className="mb-3 text-xs text-fg-muted">
        <a href={`?seg=all&min_xp=${minXp}`} className={`px-2 py-1 rounded ${segFilter === "all" ? "bg-accent text-black" : "hover:text-accent"}`}>全部高風險</a>
        <span className="ml-2">·</span>
        <span className="ml-2">當前篩出 {rows.length.toLocaleString()} 位</span>
      </div>

      <ChurnClient users={rows as any} filterSeg={segFilter} filterMinXp={minXp} />
    </div>
  );
}
