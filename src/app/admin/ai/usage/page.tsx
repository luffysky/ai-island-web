import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AIUsageChart } from "./AIUsageChart";
import { PageHero } from "@/components/admin/PageHero";
import { requireOwner } from "@/lib/admin-guard";
import { Lock, AlertTriangle, DollarSign } from "lucide-react";

export default async function AIUsagePage() {
  // 只有 owner 看得到（一般 admin 看不到使用量、避免被金額嚇到）
  const gate = await requireOwner();
  if (!gate.ok) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-10 text-center">
        <div className="mb-2 flex justify-center"><Lock className="w-8 h-8 text-fg-muted" /></div>
        <div className="font-bold">這頁只有 owner 看得到</div>
        <div className="text-sm text-fg-muted mt-1">AI 使用量 / 費用屬機密、未開放給一般管理員。</div>
      </div>
    );
  }
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
        <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 需要先跑 ai_migration.sql</div>
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

  // 本月各模型用量/費用 — 合併兩個「不重疊」來源：
  //   web 聊天 → ai_usage_daily（有 model_id）；bot/排程/推薦 → ai_model_usage（有 model_name）。
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthStart = thisMonth + "-01";
  const [{ data: modelMap }, { data: dailyRows }, { data: botRows }] = await Promise.all([
    supabase.from("ai_models").select("id, provider, model_name"),
    supabase.from("ai_usage_daily").select("model_id, provider, tokens_input, tokens_output, cost_usd, message_count").gte("date", monthStart),
    supabase.from("ai_model_usage").select("provider, model_name, tokens_input, tokens_output, cost_usd, calls").eq("month", thisMonth),
  ]);
  const idToModel = new Map<string, { provider: string; model_name: string }>();
  for (const m of (modelMap as any[]) ?? []) idToModel.set(m.id, { provider: m.provider, model_name: m.model_name });

  const muAgg = new Map<string, { provider: string; model_name: string; tokens_input: number; tokens_output: number; cost_usd: number; calls: number }>();
  const muAdd = (provider: string, model_name: string, ti: number, to: number, cost: number, calls: number) => {
    const key = `${provider}/${model_name}`;
    const cur = muAgg.get(key) ?? { provider, model_name, tokens_input: 0, tokens_output: 0, cost_usd: 0, calls: 0 };
    cur.tokens_input += ti; cur.tokens_output += to; cur.cost_usd += cost; cur.calls += calls;
    muAgg.set(key, cur);
  };
  for (const r of (dailyRows as any[]) ?? []) {
    const m = idToModel.get(r.model_id);
    muAdd(m?.provider ?? r.provider, m?.model_name ?? "(未知模型)", r.tokens_input || 0, r.tokens_output || 0, Number(r.cost_usd) || 0, r.message_count || 0);
  }
  for (const r of (botRows as any[]) ?? []) {
    muAdd(r.provider, r.model_name, r.tokens_input || 0, r.tokens_output || 0, Number(r.cost_usd) || 0, r.calls || 0);
  }
  const muThisMonth = Array.from(muAgg.values()).sort((a, b) => b.cost_usd - a.cost_usd);
  const muTotalCost = muThisMonth.reduce((s, m) => s + m.cost_usd, 0);

  return (
    <div className="space-y-6">
      <PageHero
        emoji="📊"
        title="AI Token 使用量"
        desc="近 30 天各 provider / model 用了多少 token / 多少錢。月底對帳用、超預算 alert。"
        gradient="from-yellow-500/10 via-amber-500/10 to-orange-500/10"
        borderColor="border-yellow-500/30"
      />

      {/* 本月各模型費用（含 bot / 排程 / 推薦、最完整）*/}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-bold flex items-center gap-2"><DollarSign className="w-4 h-4" /> 本月各模型費用（{thisMonth}）</h2>
          <span className="text-sm">總計 <b className="text-yellow-400">${muTotalCost.toFixed(4)}</b></span>
        </div>
        {muThisMonth.length === 0 ? (
          <p className="text-sm text-fg-muted">本月還沒有用量紀錄（部署後新的 AI 呼叫才會開始記）。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-fg-muted">
                <tr>
                  <th className="py-1">模型</th><th>provider</th>
                  <th className="text-right">呼叫</th><th className="text-right">in tok</th>
                  <th className="text-right">out tok</th><th className="text-right">費用</th>
                </tr>
              </thead>
              <tbody>
                {muThisMonth.map((m: any) => (
                  <tr key={m.provider + m.model_name} className="border-t border-border">
                    <td className="py-1.5 font-mono text-xs">{m.model_name}</td>
                    <td className="text-fg-muted">{m.provider}</td>
                    <td className="text-right tabular-nums">{m.calls}</td>
                    <td className="text-right tabular-nums">{Number(m.tokens_input).toLocaleString()}</td>
                    <td className="text-right tabular-nums">{Number(m.tokens_output).toLocaleString()}</td>
                    <td className="text-right tabular-nums text-yellow-400">${Number(m.cost_usd).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-fg-muted mt-2">
          涵蓋 <b>web 聊天</b>（ai_usage_daily）+ <b>LINE/TG/Discord bot・排程・推薦</b>（callAI）+ <b>命令列腳本</b>（章節生成 / 題庫 seed，記為 <code>cli:</code> 開頭的模型）。
          ⚠️ 僅 <b>2026-06-29 之後</b>跑的 CLI 腳本才有記錄；在那之前的批次（如 6/13、6/22）仍只在 Claude 官方後台看得到。
        </p>
      </div>

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
        <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
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
                <tr key={prov} className="border-t border-border">
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
        <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
              <tr>
                <th className="px-4 py-3">用戶</th>
                <th className="px-4 py-3 text-right">對話數</th>
                <th className="px-4 py-3 text-right">Tokens</th>
                <th className="px-4 py-3 text-right">費用 (USD)</th>
              </tr>
            </thead>
            <tbody>
              {topUsersSorted.map((u: any) => (
                <tr key={u.user_id} className="border-t border-border">
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
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
