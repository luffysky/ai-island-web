import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { formatTW } from "@/lib/format-date";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClearCacheButtons } from "./ClearCacheButtons";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminAiCachePage() {
  const admin = createSupabaseAdmin();

  const [{ count: totalEntries }, { data: topHits }, { data: sumRow }] = await Promise.all([
    admin.from("ai_response_cache").select("*", { count: "exact", head: true }),
    admin.from("ai_response_cache")
      .select("question_text, hit_count, last_hit_at, model_used")
      .order("hit_count", { ascending: false })
      .limit(20),
    admin.from("ai_response_cache").select("hit_count"),
  ]);

  const totalHits = (sumRow ?? []).reduce((s: number, r: any) => s + (r.hit_count ?? 0), 0);
  // 命中率 = 命中數 / (命中數 + 寫入數)；總提問數約等於 totalEntries + totalHits
  const totalQuestions = (totalEntries ?? 0) + totalHits;
  const hitRate = totalQuestions > 0 ? (totalHits / totalQuestions) * 100 : 0;
  const savedCalls = totalHits; // 每次命中省一次 AI 呼叫

  return (
    <div>
      <PageHero
        emoji="💾"
        title="AI 回應快取"
        desc="相同問題第二次秒回、不燒 token。依 greenbao_ai_cost_spec v0。命中率高省 AI 費用、命中低代表 prompt 太多樣。"
        gradient="from-emerald-500/10 via-green-500/10 to-lime-500/10"
        borderColor="border-emerald-500/30"
      >
        <ClearCacheButtons />
      </PageHero>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="快取條目數" value={(totalEntries ?? 0).toLocaleString()} />
        <Stat label="總命中次數" value={totalHits.toLocaleString()} tone="accent" />
        <Stat label="估計命中率" value={`${hitRate.toFixed(1)}%`} tone="accent" />
        <Stat label="省下 AI 呼叫" value={savedCalls.toLocaleString()} tone="warning" />
      </div>

      <section className="rounded-xl bg-bg-card border border-border">
        <div className="px-4 py-3 border-b border-border font-bold text-sm">🔥 最常被命中的問題 Top 20</div>
        {(topHits ?? []).length === 0 ? (
          <EmptyState emoji="💾" title="還沒有任何快取資料" desc="第一次有人問問題就會寫進來、第二次起命中" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-fg-muted text-xs">
              <tr>
                <th className="text-left px-3 py-2">問題</th>
                <th className="text-right px-3 py-2 w-20">命中</th>
                <th className="text-right px-3 py-2 w-32">最近命中</th>
                <th className="text-left px-3 py-2 w-40">產生模型</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topHits!.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2 truncate max-w-md" title={r.question_text}>{r.question_text}</td>
                  <td className="px-3 py-2 text-right font-bold text-accent">{r.hit_count}</td>
                  <td className="px-3 py-2 text-right text-[10px] text-fg-muted">
                    {r.last_hit_at ? formatTW(r.last_hit_at) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-fg-muted font-mono">{r.model_used ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-[11px] text-fg-muted mt-4">
        🛡️ 鐵則：快取錯了也不能比現在差。失敗自動 fallback 到正常 AI 呼叫。
        命中條件：問題正規化後完全相同 + 對話第一則訊息 + tone/persona/context 全部相同。
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "accent" | "warning" }) {
  const color = tone === "accent" ? "text-accent" : tone === "warning" ? "text-warning" : "text-fg";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
