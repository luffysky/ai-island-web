import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AIUsageChart } from "./AIUsageChart";

export default async function AIUsagePage() {
  const supabase = createSupabaseAdmin();

  // 過去 30 天
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const { data: usage, error } = await supabase
    .from("ai_usage_daily")
    .select("*")
    .gte("date", thirtyDaysAgo)
    .order("date", { ascending: true });

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ 需要先跑 ai_migration.sql</div>
      </div>
    );
  }

  // 聚合：每天 / 每 provider
  const byDate: Record<string, any> = {};
  const byProvider: Record<string, { input: number; output: number; cost: number; count: number }> = {};

  (usage ?? []).forEach((u: any) => {
    if (!byDate[u.date]) byDate[u.date] = { date: u.date, cost: 0, tokens: 0, calls: 0 };
    byDate[u.date].cost += Number(u.cost_usd);
    byDate[u.date].tokens += u.tokens_input + u.tokens_output;
    byDate[u.date].calls += u.message_count;
    byDate[u.date][u.provider] = (byDate[u.date][u.provider] ?? 0) + Number(u.cost_usd);

    if (!byProvider[u.provider]) byProvider[u.provider] = { input: 0, output: 0, cost: 0, count: 0 };
    byProvider[u.provider].input += u.tokens_input;
    byProvider[u.provider].output += u.tokens_output;
    byProvider[u.provider].cost += Number(u.cost_usd);
    byProvider[u.provider].count += u.message_count;
  });

  const dailyData = Object.values(byDate);
  const totalCost = dailyData.reduce((s: number, d: any) => s + d.cost, 0);
  const totalCalls = dailyData.reduce((s: number, d: any) => s + d.calls, 0);
  const totalTokens = dailyData.reduce((s: number, d: any) => s + d.tokens, 0);

  // Top users
  const { data: topUsers } = await supabase
    .from("ai_usage_daily")
    .select("user_id, cost_usd, tokens_input, tokens_output, message_count, profiles(username, display_name)")
    .gte("date", thirtyDaysAgo);

  const userTotals: Record<string, any> = {};
  (topUsers ?? []).forEach((u: any) => {
    const k = u.user_id;
    if (!userTotals[k]) {
      userTotals[k] = {
        user_id: k,
        username: u.profiles?.username,
        display_name: u.profiles?.display_name,
        cost: 0,
        tokens: 0,
        calls: 0,
      };
    }
    userTotals[k].cost += Number(u.cost_usd);
    userTotals[k].tokens += u.tokens_input + u.tokens_output;
    userTotals[k].calls += u.message_count;
  });
  const topUsersSorted = Object.values(userTotals).sort((a: any, b: any) => b.cost - a.cost).slice(0, 10);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">📊 AI Token 使用量（近 30 天）</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="總費用" value={`$${totalCost.toFixed(2)}`} color="text-yellow-400" />
        <Stat label="總 Tokens" value={totalTokens.toLocaleString()} color="text-blue-400" />
        <Stat label="總對話" value={totalCalls} color="text-green-400" />
        <Stat label="日均費用" value={`$${(totalCost / 30).toFixed(2)}`} color="text-purple-400" />
      </div>

      {/* 圖表 */}
      <AIUsageChart dailyData={dailyData as any} />

      {/* Provider 統計 */}
      <div>
        <h3 className="font-bold mb-3">Provider 使用統計</h3>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-elevated)] text-left text-xs text-[var(--color-fg-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">對話數</th>
                <th className="px-4 py-3 text-right">Input tokens</th>
                <th className="px-4 py-3 text-right">Output tokens</th>
                <th className="px-4 py-3 text-right">費用 (USD)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byProvider).map(([prov, stats]) => (
                <tr key={prov} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 font-medium uppercase">{prov}</td>
                  <td className="px-4 py-3 text-right">{stats.count}</td>
                  <td className="px-4 py-3 text-right">{stats.input.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{stats.output.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-yellow-400 font-semibold">${stats.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top users */}
      <div>
        <h3 className="font-bold mb-3">Top 10 使用者</h3>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-elevated)] text-left text-xs text-[var(--color-fg-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">用戶</th>
                <th className="px-4 py-3 text-right">對話數</th>
                <th className="px-4 py-3 text-right">Tokens</th>
                <th className="px-4 py-3 text-right">費用 (USD)</th>
              </tr>
            </thead>
            <tbody>
              {topUsersSorted.map((u: any) => (
                <tr key={u.user_id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3">{u.display_name || u.username}</td>
                  <td className="px-4 py-3 text-right">{u.calls}</td>
                  <td className="px-4 py-3 text-right">{u.tokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">${u.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="text-xs text-[var(--color-fg-muted)]">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
