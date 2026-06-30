"use client";

import { useState } from "react";

type Agent = { key: string; label: string };
type Model = { provider: string; model_name: string };

export function AgentModelsClient({ agents, models, current }: { agents: Agent[]; models: Model[]; current: Record<string, string> }) {
  const [map, setMap] = useState<Record<string, string>>(current);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/admin/creator-island/agent-models", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ map }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "儲存失敗");
      setMap(j.current ?? {}); setMsg("已儲存");
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4 max-w-2xl">
      {models.length === 0 && <div className="text-sm text-amber-300">⚠️ 目前沒有啟用的模型。先到 <a href="/admin/ai/models" className="underline">/admin/ai/models</a> 新增並啟用（可加 OpenRouter）。</div>}
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2 text-sm">⚠️ {err}</div>}
      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 text-sm">✅ {msg}</div>}

      <div className="space-y-3">
        {agents.map((a) => (
          <div key={a.key} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <div className="sm:w-56 shrink-0 text-sm">{a.label}</div>
            <select value={map[a.key] ?? ""} onChange={(e) => setMap((p) => ({ ...p, [a.key]: e.target.value }))}
              className="w-full sm:flex-1 min-w-0 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">自動（最佳可用）</option>
              {models.map((m) => <option key={m.model_name} value={m.model_name}>{m.provider} ｜ {m.model_name}</option>)}
            </select>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving} className="px-5 py-2 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">{saving ? "儲存中…" : "儲存設定"}</button>
      <p className="text-xs text-fg-muted">提示：凝聚/演化/轉譯/DNA 用便宜模型即可；只有「編織」成品可考慮稍好的模型。改完即時生效（30 秒快取）。</p>
    </div>
  );
}
