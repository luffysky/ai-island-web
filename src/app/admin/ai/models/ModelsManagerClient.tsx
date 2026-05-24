"use client";
import { useState } from "react";
import { Check, Eye, EyeOff, Power, Save, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { devLog } from "@/lib/dev-log";

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
  id?: string;
  provider: string;
  enabled: boolean;
  monthly_budget_usd: number;
  used_this_month_usd: number;
  metadata?: { has_key?: boolean } | null;
  updated_at: string;
}

type Notice = {
  type: "success" | "error";
  message: string;
};

const PROVIDERS = ["anthropic", "openai", "google", "groq"];

function keyHasSecret(key?: ApiKey) {
  if (!key) return false;
  return key.metadata?.has_key !== false;
}

function formatUpdatedAt(value?: string) {
  if (!value) return "尚未更新";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ModelsManagerClient({
  initialModels,
  initialKeys,
}: {
  initialModels: Model[];
  initialKeys: ApiKey[];
}) {
  const confirm = useConfirm();
  const [models, setModels] = useState(initialModels);
  const [keys, setKeys] = useState(initialKeys);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const showNotice = (type: Notice["type"], message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 3000);
  };

  const readJson = async (res: Response) => {
    return res.json().catch(() => ({}));
  };

  const requestJson = async (url: string, init: RequestInit) => {
    const res = await fetch(url, init);
    const data = await readJson(res);
    if (!res.ok) {
      devLog.error("[AI admin save failed]", data);
      throw new Error(data.message || data.error || "儲存失敗");
    }
    return data;
  };

  const upsertKeyState = (key: ApiKey) => {
    setKeys((current) => {
      const exists = current.some((item) => item.provider === key.provider);
      if (!exists) return [...current, key];
      return current.map((item) => item.provider === key.provider ? { ...item, ...key } : item);
    });
  };

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
      const data = await requestJson("/api/admin/ai/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      if (data.key) upsertKeyState(data.key);
      setKeyInputs((current) => ({ ...current, [provider]: "" }));
      setKeySaved(provider);
      showNotice("success", "API key 已儲存");
      setTimeout(() => setKeySaved(null), 2000);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "API key 儲存失敗");
    } finally {
      setSavingKey(null);
    }
  };

  const updateBudget = async (provider: string, budget: number) => {
    if (!Number.isFinite(budget) || budget < 0) {
      showNotice("error", "月預算必須是 0 以上的數字");
      return;
    }

    try {
      const data = await requestJson("/api/admin/ai/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, monthly_budget_usd: budget }),
      });
      if (data.key) upsertKeyState(data.key);
      setBudgetDrafts((current) => ({ ...current, [provider]: String(budget) }));
      showNotice("success", "月預算已儲存");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "月預算儲存失敗");
    }
  };

  const toggleKeyEnabled = async (provider: string, enabled: boolean) => {
    try {
      const data = await requestJson("/api/admin/ai/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, enabled }),
      });
      if (data.key) upsertKeyState(data.key);
      showNotice("success", enabled ? "API key 已啟用" : "API key 已停用");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "狀態儲存失敗");
    }
  };

  const deleteKey = async (provider: string) => {
    const ok = await confirm({
      title: `刪除 ${provider} 的 API key？`,
      description: "刪除後前台將無法使用這個 provider。",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;

    try {
      await requestJson("/api/admin/ai/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      setKeys((current) => current.filter((key) => key.provider !== provider));
      setKeyInputs((current) => ({ ...current, [provider]: "" }));
      setBudgetDrafts((current) => ({ ...current, [provider]: "50" }));
      showNotice("success", "API key 已刪除");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "API key 刪除失敗");
    }
  };

  const toggleModelActive = async (id: string, is_active: boolean) => {
    try {
      await requestJson("/api/admin/ai/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active }),
      });
      setModels((current) => current.map((m) => m.id === id ? { ...m, is_active } : m));
      showNotice("success", "模型狀態已儲存");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "模型狀態儲存失敗");
    }
  };

  const setDefault = async (id: string) => {
    try {
      await requestJson("/api/admin/ai/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_default: true }),
      });
      setModels((current) => current.map((m) => ({ ...m, is_default: m.id === id })));
      showNotice("success", "預設模型已儲存");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "預設模型儲存失敗");
    }
  };

  const updateLimit = async (id: string, free_tier_daily_limit: number) => {
    if (!Number.isFinite(free_tier_daily_limit) || free_tier_daily_limit < 0) {
      showNotice("error", "免費額度必須是 0 以上的數字");
      return;
    }

    try {
      await requestJson("/api/admin/ai/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, free_tier_daily_limit }),
      });
      setModels((current) => current.map((m) => m.id === id ? { ...m, free_tier_daily_limit } : m));
      showNotice("success", "免費額度已儲存");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "免費額度儲存失敗");
    }
  };

  return (
    <div className="space-y-8">
      {notice && (
        <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          notice.type === "success"
            ? "border-green-500/30 bg-green-500/15 text-green-300"
            : "border-red-500/30 bg-red-500/15 text-red-300"
        }`}>
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="rounded p-1 hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
      )}

      {PROVIDERS.map((provider) => {
        const key = keys.find((k) => k.provider === provider);
        const providerModels = byProvider[provider] ?? [];
        const used = Number(key?.used_this_month_usd ?? 0);
        const budget = Number(key?.monthly_budget_usd ?? 50);
        const budgetValue = budgetDrafts[provider] ?? String(budget);
        const pct = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
        const hasSecret = keyHasSecret(key);

        return (
          <div key={provider} className="bg-bg-card border border-border rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-lg uppercase">{provider}</h3>
                <div className="text-xs text-fg-muted mt-1">
                  最後更新：{formatUpdatedAt(key?.updated_at)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  hasSecret ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                }`}>
                  {hasSecret ? "✓ 已設定" : "未設定 key"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  key?.enabled ? "bg-sky-500/20 text-sky-300" : "bg-gray-500/20 text-gray-400"
                }`}>
                  {key?.enabled ? "啟用" : "停用"}
                </span>
              </div>
            </div>

            {/* API key */}
            <div className="mb-4 p-3 bg-bg rounded-lg space-y-3">
              <div className="text-xs text-fg-muted">API Key（加密儲存，不顯示原文）</div>
              <div className="flex gap-2">
                <input
                  type={showKey[provider] ? "text" : "password"}
                  value={keyInputs[provider] ?? ""}
                  onChange={(e) => setKeyInputs({ ...keyInputs, [provider]: e.target.value })}
                  placeholder={hasSecret ? "✓ 已設定（輸入新 key 會覆蓋）" : "貼上 API key"}
                  className="flex-1 bg-bg-elevated border border-border rounded p-2 text-sm font-mono"
                />
                <button
                  onClick={() => setShowKey({ ...showKey, [provider]: !showKey[provider] })}
                  className="p-2 hover:bg-bg-elevated rounded"
                  title={showKey[provider] ? "隱藏輸入內容" : "顯示輸入內容"}
                >
                  {showKey[provider] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => saveKey(provider)}
                  disabled={!keyInputs[provider] || savingKey === provider}
                  className="px-3 py-2 bg-accent text-black text-sm font-semibold rounded disabled:opacity-50"
                  title="儲存 API key"
                >
                  {keySaved === provider ? <Check size={14} /> : <Save size={14} />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleKeyEnabled(provider, !key?.enabled)}
                  disabled={!key || !hasSecret}
                  className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs hover:bg-bg-elevated disabled:opacity-50"
                >
                  <Power size={14} />
                  {key?.enabled ? "停用" : "啟用"}
                </button>
                <button
                  onClick={() => deleteKey(provider)}
                  disabled={!key}
                  className="inline-flex items-center gap-1 rounded border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  刪除
                </button>
              </div>

              {/* 月預算 */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-fg-muted">月預算</span>
                <input
                  type="number"
                  min={0}
                  value={budgetValue}
                  onChange={(e) => setBudgetDrafts({ ...budgetDrafts, [provider]: e.target.value })}
                  onBlur={(e) => updateBudget(provider, Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateBudget(provider, Number(e.currentTarget.value));
                  }}
                  className="w-24 bg-bg-elevated border border-border rounded p-1 text-sm"
                />
                <span className="text-xs">USD</span>
                <span className="text-xs text-fg-muted ml-auto">
                  已用 ${used.toFixed(2)} / ${budget}（{pct.toFixed(1)}%）
                </span>
              </div>
              <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${pct > 90 ? "bg-red-400" : pct > 70 ? "bg-yellow-400" : "bg-green-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* 模型列表 */}
            <div className="space-y-2">
              {providerModels.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-bg rounded-lg">
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
                    <div className="text-xs text-fg-muted">
                      {m.model_name} · ${m.cost_input_per_1m}/${m.cost_output_per_1m}/1M tokens
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-fg-muted">免費/日</span>
                    <input
                      type="number"
                      min={0}
                      value={m.free_tier_daily_limit}
                      onChange={(e) => updateLimit(m.id, Number(e.target.value))}
                      className="w-16 bg-bg-elevated border border-border rounded p-1"
                    />
                  </div>
                  {!m.is_default && (
                    <button
                      onClick={() => setDefault(m.id)}
                      className="text-xs px-2 py-1 hover:bg-bg-elevated rounded"
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
