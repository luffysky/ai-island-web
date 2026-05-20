"use client";
import { useState } from "react";
import { Eye, EyeOff, Save, Check, Plus } from "lucide-react";

interface Model {
  id: string;
  provider: string;
  model_name: string;
  display_name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  free_tier_daily_limit: number;
  cost_input_per_1m: number;
  cost_output_per_1m: number;
}

interface ApiKey {
  provider: string;
  enabled: boolean;
  monthly_budget_usd: number;
  used_this_month_usd: number;
  updated_at: string;
}

const PROVIDERS = ["anthropic", "openai", "google", "groq"];

export function ModelsManagerClient({
  initialModels,
  initialKeys,
}: {
  initialModels: Model[];
  initialKeys: ApiKey[];
}) {
  const [models, setModels] = useState(initialModels);
  const [keys, setKeys] = useState(initialKeys);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState<string | null>(null);

  // 按 provider 分組
  const byProvider: Record<string, Model[]> = {};
  models.forEach((m) => {
    if (!byProvider[m.provider]) byProvider[m.provider] = [];
    byProvider[m.provider].push(m);
  });

  const saveKey = async (provider: string) => {
    const apiKey = keyInputs[provider];
    if (!apiKey) return;
    setSavingKey(provider);
    try {
      const res = await fetch("/api/admin/ai/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      if (res.ok) {
        setKeyInputs({ ...keyInputs, [provider]: "" });
        setKeySaved(provider);
        setTimeout(() => setKeySaved(null), 2000);
      }
    } finally {
      setSavingKey(null);
    }
  };

  const updateBudget = async (provider: string, budget: number) => {
    await fetch("/api/admin/ai/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, monthly_budget_usd: budget }),
    });
    setKeys(keys.map((k) => k.provider === provider ? { ...k, monthly_budget_usd: budget } : k));
  };

  const toggleModelActive = async (id: string, is_active: boolean) => {
    await fetch("/api/admin/ai/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active }),
    });
    setModels(models.map((m) => m.id === id ? { ...m, is_active } : m));
  };

  const setDefault = async (id: string) => {
    await fetch("/api/admin/ai/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_default: true }),
    });
    setModels(models.map((m) => ({ ...m, is_default: m.id === id })));
  };

  const updateLimit = async (id: string, free_tier_daily_limit: number) => {
    await fetch("/api/admin/ai/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, free_tier_daily_limit }),
    });
    setModels(models.map((m) => m.id === id ? { ...m, free_tier_daily_limit } : m));
  };

  return (
    <div className="space-y-8">
      {PROVIDERS.map((provider) => {
        const key = keys.find((k) => k.provider === provider);
        const providerModels = byProvider[provider] ?? [];
        const used = key?.used_this_month_usd ?? 0;
        const budget = key?.monthly_budget_usd ?? 50;
        const pct = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;

        return (
          <div key={provider} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg uppercase">{provider}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${
                key?.enabled ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
              }`}>
                {key?.enabled ? "啟用" : "未設定"}
              </span>
            </div>

            {/* API key */}
            <div className="mb-4 p-3 bg-[var(--color-bg)] rounded-lg space-y-2">
              <div className="text-xs text-[var(--color-fg-muted)]">API Key（加密儲存）</div>
              <div className="flex gap-2">
                <input
                  type={showKey[provider] ? "text" : "password"}
                  value={keyInputs[provider] ?? ""}
                  onChange={(e) => setKeyInputs({ ...keyInputs, [provider]: e.target.value })}
                  placeholder={key ? "✓ 已設定（輸入新 key 會覆蓋）" : "貼上 API key"}
                  className="flex-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded p-2 text-sm font-mono"
                />
                <button
                  onClick={() => setShowKey({ ...showKey, [provider]: !showKey[provider] })}
                  className="p-2 hover:bg-[var(--color-bg-elevated)] rounded"
                >
                  {showKey[provider] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => saveKey(provider)}
                  disabled={!keyInputs[provider] || savingKey === provider}
                  className="px-3 py-2 bg-[var(--color-accent)] text-black text-sm font-semibold rounded disabled:opacity-50"
                >
                  {keySaved === provider ? <Check size={14} /> : <Save size={14} />}
                </button>
              </div>

              {/* 月預算 */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-[var(--color-fg-muted)]">月預算</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => updateBudget(provider, Number(e.target.value))}
                  className="w-24 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded p-1 text-sm"
                />
                <span className="text-xs">USD</span>
                <span className="text-xs text-[var(--color-fg-muted)] ml-auto">
                  已用 ${used.toFixed(2)} / ${budget}（{pct.toFixed(1)}%）
                </span>
              </div>
              <div className="h-1 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${pct > 90 ? "bg-red-400" : pct > 70 ? "bg-yellow-400" : "bg-green-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* 模型列表 */}
            <div className="space-y-2">
              {providerModels.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
                  <input
                    type="checkbox"
                    checked={m.is_active}
                    onChange={(e) => toggleModelActive(m.id, e.target.checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {m.display_name}
                      {m.is_default && <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">預設</span>}
                    </div>
                    <div className="text-xs text-[var(--color-fg-muted)]">
                      {m.model_name} · ${m.cost_input_per_1m}/${m.cost_output_per_1m}/1M tokens
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--color-fg-muted)]">免費/日</span>
                    <input
                      type="number"
                      value={m.free_tier_daily_limit}
                      onChange={(e) => updateLimit(m.id, Number(e.target.value))}
                      className="w-16 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded p-1"
                    />
                  </div>
                  {!m.is_default && (
                    <button
                      onClick={() => setDefault(m.id)}
                      className="text-xs px-2 py-1 hover:bg-[var(--color-bg-elevated)] rounded"
                    >
                      設預設
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
