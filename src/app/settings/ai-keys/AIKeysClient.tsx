"use client";
import { useState } from "react";
import { Trash2, Plus, ExternalLink, CheckCircle2, XCircle, Loader2, Power } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { BYOK_PROVIDERS } from "@/lib/ai-key-test";

interface KeyMeta {
  masked?: string;
  base_url?: string;
  model?: string;
}
interface UserKey {
  id: string;
  provider: string;
  label: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  metadata?: KeyMeta | null;
}

const PROVIDERS = BYOK_PROVIDERS;
const providerMeta = (v: string) => PROVIDERS.find((p) => p.value === v);

export function AIKeysClient({ initialKeys }: { initialKeys: UserKey[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [keys, setKeys] = useState<UserKey[]>(initialKeys);
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; hint: string } | null>(null);

  const meta = providerMeta(provider);
  const isCustom = provider === "custom";

  const refresh = async () => {
    const r = await fetch("/api/user/ai-keys", { credentials: "include" });
    const d = await r.json();
    if (Array.isArray(d.keys)) setKeys(d.keys);
  };

  const resetForm = () => {
    setApiKey(""); setLabel(""); setBaseUrl(""); setModel("");
    setError(""); setTestResult(null);
  };

  const testKey = async () => {
    if (!apiKey.trim() || isCustom) return;
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      const res = await fetch("/api/user/ai-keys/test", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const d = await res.json();
      setTestResult({ ok: !!d.ok, hint: d.hint || d.error || "驗證失敗" });
    } catch (e: any) {
      setTestResult({ ok: false, hint: e.message });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!apiKey.trim()) return;
    if (isCustom && (!baseUrl.trim() || !model.trim())) {
      setError("自訂端點需填 Base URL 與模型名");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/ai-keys", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          label: label || `${meta?.label ?? provider} key`,
          ...(isCustom ? { baseUrl, model } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "儲存失敗");
        return;
      }
      await refresh();
      resetForm();
      setAdding(false);
      toast.success("已新增 API key");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (k: UserKey) => {
    setBusyId(k.id);
    try {
      const res = await fetch("/api/user/ai-keys", {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: k.id, is_active: !k.is_active }),
      });
      if (res.ok) {
        setKeys((cur) => cur.map((x) => (x.id === k.id ? { ...x, is_active: !x.is_active } : x)));
        toast.success(!k.is_active ? "已啟用" : "已停用");
      } else {
        toast.error("切換失敗");
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (k: UserKey) => {
    const pm = providerMeta(k.provider);
    const ok = await confirm({
      title: `刪除「${k.label}」？`,
      description: `${pm?.label ?? k.provider} 的這把 key 將被移除、需重新輸入才能再用。`,
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/user/ai-keys?id=${encodeURIComponent(k.id)}`, {
      credentials: "include",
      method: "DELETE",
    });
    if (res.ok) {
      setKeys((cur) => cur.filter((x) => x.id !== k.id));
      toast.success("已刪除");
    } else {
      toast.error("刪除失敗");
    }
  };

  return (
    <div className="space-y-4">
      {/* 現有 keys（逐 row by id、可多把 / 同 provider 多把） */}
      {keys.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl divide-y divide-border">
          {keys.map((k) => {
            const pm = providerMeta(k.provider);
            const md = k.metadata ?? {};
            return (
              <div key={k.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2 flex-wrap">
                    {pm?.label ?? k.provider}
                    <span className="text-[11px] font-normal text-fg-muted">{k.label}</span>
                    {!k.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-fg-muted/15 text-fg-muted">停用中</span>
                    )}
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5 break-all">
                    {md.masked && <span className="font-mono">{md.masked}</span>}
                    {k.provider === "custom" && md.base_url && (
                      <span className="block mt-0.5">端點 {md.base_url} · 模型 {md.model}</span>
                    )}
                    <span className="block mt-0.5">
                      建立於 {new Date(k.created_at).toLocaleDateString("zh-TW")}
                      {k.last_used_at && ` · 最後使用 ${new Date(k.last_used_at).toLocaleDateString("zh-TW")}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(k)}
                    disabled={busyId === k.id}
                    title={k.is_active ? "停用" : "啟用"}
                    className={`p-2 rounded disabled:opacity-50 ${
                      k.is_active ? "text-emerald-500 hover:bg-emerald-500/10" : "text-fg-muted hover:bg-fg-muted/10"
                    }`}
                  >
                    {busyId === k.id ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                  </button>
                  <button
                    onClick={() => remove(k)}
                    title="刪除"
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full p-4 border border-dashed border-border rounded-xl hover:border-accent hover:bg-bg-card transition flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} /> 新增 API Key
        </button>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-fg-muted mb-1 block">Provider</label>
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setTestResult(null); setError(""); }}
              className="w-full bg-bg border border-border rounded p-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {meta?.url && (
              <a
                href={meta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline mt-1 inline-flex items-center gap-1"
              >
                <ExternalLink size={12} /> 取得 {meta.label} API key
              </a>
            )}
            <div className="mt-1.5 text-[11px] text-fg-muted">
              {meta?.hint && <span className="block">格式：{meta.hint}</span>}
              <span className="block mt-0.5">
                {isCustom
                  ? "可用模型：由你下面填的模型名決定"
                  : `這把 key 可解鎖的模型：${meta?.models.join("、")}`}
              </span>
              <span className="block mt-0.5">（存好後、在 AI 對話框打開「用自己的 key」就能用你的額度）</span>
            </div>
          </div>

          {/* 自訂端點：base URL + 模型（比照後台管理設自訂模型） */}
          {isCustom && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-fg-muted mb-1 block">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://your-host/v1"
                  className="w-full bg-bg border border-border rounded p-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-fg-muted mb-1 block">模型名</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="例：llama-3.1-8b / gpt-4o-mini"
                  className="w-full bg-bg border border-border rounded p-2 text-sm font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-fg-muted mb-1 block">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={meta?.placeholder ?? "貼上 API key"}
              className="w-full bg-bg border border-border rounded p-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-fg-muted mb-1 block">標籤（選填、同 provider 多把時用來分辨）</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例：個人 Claude key / 公司 key"
              className="w-full bg-bg border border-border rounded p-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {testResult && (
            <p className={`text-sm flex items-center gap-1.5 ${testResult.ok ? "text-emerald-500" : "text-red-400"}`}>
              {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {testResult.hint}
            </p>
          )}

          <div className="flex gap-2 flex-wrap items-center">
            {!isCustom && (
              <button
                onClick={testKey}
                disabled={testing || !apiKey}
                className="px-4 py-2 border border-accent text-accent rounded font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : null} 測試
              </button>
            )}
            <button
              onClick={save}
              disabled={saving || !apiKey || (isCustom && (!baseUrl || !model))}
              className="px-4 py-2 bg-accent text-black rounded font-semibold disabled:opacity-50"
            >
              {saving ? "儲存中..." : "儲存"}
            </button>
            <button
              onClick={() => { setAdding(false); resetForm(); }}
              className="px-4 py-2 border border-border rounded text-sm"
            >
              取消
            </button>
            {isCustom && (
              <span className="text-[11px] text-fg-muted">自訂端點不做線上測試、直接儲存即可</span>
            )}
          </div>

          <p className="text-xs text-fg-muted">
            🔒 你的 key 用 AES-256-GCM 加密、僅在你要求 AI 對話時解密、不會被其他人看到。
          </p>
        </div>
      )}

      <Link href="/settings" className="block text-sm text-fg-muted hover:text-accent">
        ← 回設定
      </Link>
    </div>
  );
}
