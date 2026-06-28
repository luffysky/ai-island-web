import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

async function count(admin: any, table: string, filter?: (q: any) => any) {
  let q = admin.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

const AGENT_LABEL: Record<string, string> = { synthesize: "🧲 凝聚", evolve: "🌿 演化", compose: "🧵 編織", transcreate: "🌏 轉譯", dna: "🧬 DNA", advise: "💡 顧問" };

export default async function CreatorIslandAdminPage() {
  const admin = createSupabaseAdmin();
  const [workspaces, fragments, works, runs, listings, pool, posts, comments] = await Promise.all([
    count(admin, "ci_workspaces"), count(admin, "ci_fragments"), count(admin, "ci_works"),
    count(admin, "ci_agent_runs"), count(admin, "ci_listings"), count(admin, "ci_fragment_pool"),
    count(admin, "ci_posts").catch(() => 0), count(admin, "ci_comments"),
  ]);
  const { data: recentRuns } = await admin
    .from("ci_agent_runs")
    .select("id, agent_type, provider, model, tokens_input, tokens_output, cost_usd, status, input, output, created_at, user_id")
    .order("created_at", { ascending: false }).limit(25);
  const { data: notifs } = await admin
    .from("notifications").select("id, kind, title, body, read_at, created_at")
    .order("created_at", { ascending: false }).limit(15);

  const stats: [string, number, string][] = [
    ["工作空間", workspaces, "/admin/creator-island"], ["碎片", fragments, ""], ["作品", works, ""],
    ["AI 動作", runs, "#runs"], ["上架", listings, ""], ["碎片庫池", pool, ""], ["貼文", posts, ""], ["留言", comments, ""],
  ];

  return (
    <div className="space-y-6">
      <PageHero emoji="🏝️" title="創作者島嶼 — 監看" desc="島嶼活動總覽、AI 對話紀錄（含 token/成本）、通知監看。AI 用量已併入 /admin/ai/usage。"
        gradient="from-cyan-500/10 via-teal-500/10 to-emerald-500/10" borderColor="border-teal-500/30" />

      <div className="flex gap-2 text-sm">
        <Link href="/admin/ai/creator-island" className="px-3 py-1.5 rounded-full bg-bg-card border border-border hover:text-accent">🤖 各 agent 模型設定</Link>
        <Link href="/admin/ai/usage" className="px-3 py-1.5 rounded-full bg-bg-card border border-border hover:text-accent">📊 AI Token 用量</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(([l, v]) => (
          <div key={l} className="bg-bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-accent">{v}</div>
            <div className="text-xs text-fg-muted mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div id="runs" className="bg-bg-card border border-border rounded-2xl p-4">
        <div className="font-bold mb-3">🗨️ AI 對話紀錄（最近 25）</div>
        <div className="space-y-2">
          {(recentRuns ?? []).length === 0 && <div className="text-sm text-fg-muted">尚無紀錄。</div>}
          {(recentRuns as any[] ?? []).map((r) => (
            <details key={r.id} className="bg-bg-elevated rounded-lg p-3 text-sm">
              <summary className="cursor-pointer flex items-center gap-2 flex-wrap">
                <span className="font-bold">{AGENT_LABEL[r.agent_type] ?? r.agent_type}</span>
                <span className="text-xs text-fg-muted">{r.provider}/{r.model}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.status === "succeeded" ? "bg-emerald-500/15 text-emerald-300" : r.status === "failed" ? "bg-red-500/15 text-red-300" : "bg-bg-card text-fg-muted"}`}>{r.status}</span>
                <span className="text-xs text-fg-muted">in {r.tokens_input ?? 0} / out {r.tokens_output ?? 0} tok · ${Number(r.cost_usd ?? 0).toFixed(4)}</span>
                <span className="ml-auto text-[10px] text-fg-muted">{new Date(r.created_at).toLocaleString("zh-TW")}</span>
              </summary>
              <div className="mt-2 space-y-1 text-xs">
                <div className="text-fg-muted">輸入：<pre className="whitespace-pre-wrap font-mono bg-bg/50 rounded p-2 mt-1">{JSON.stringify(r.input)?.slice(0, 600)}</pre></div>
                {r.output && <div className="text-fg-muted">輸出：<pre className="whitespace-pre-wrap font-mono bg-bg/50 rounded p-2 mt-1">{JSON.stringify(r.output)?.slice(0, 800)}</pre></div>}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-4">
        <div className="font-bold mb-3">🔔 通知監看（最近 15）</div>
        <div className="space-y-1.5">
          {(notifs ?? []).length === 0 && <div className="text-sm text-fg-muted">尚無通知。</div>}
          {(notifs as any[] ?? []).map((n) => (
            <div key={n.id} className="flex items-center gap-2 text-sm bg-bg-elevated rounded-lg px-3 py-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-card text-fg-muted">{n.kind}</span>
              <span className="flex-1">{n.title}</span>
              {!n.read_at && <span className="text-[10px] text-amber-300">未讀</span>}
              <span className="text-[10px] text-fg-muted">{new Date(n.created_at).toLocaleString("zh-TW")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
