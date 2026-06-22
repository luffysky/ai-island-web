"use client";
import { useState } from "react";
import { Trash2, Plus, ExternalLink, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { BYOK_PROVIDERS } from "@/lib/ai-key-test";

interface UserKey {
  id: string;
  provider: string;
  label: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

const PROVIDERS = BYOK_PROVIDERS;

export function AIKeysClient({ initialKeys }: { initialKeys: UserKey[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [keys, setKeys] = useState(initialKeys);
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; hint: string } | null>(null);

  const testKey = async () => {
    if (!apiKey.trim()) return;
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
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/ai-keys", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, label: label || `${provider} key` }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "儲存失敗");
        return;
      }
      // refresh
      const r = await fetch("/api/user/ai-keys");
      const d = await r.json();
      setKeys(d.keys);
      setApiKey("");
      setLabel("");
      setAdding(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: string) => {
    const ok = await confirm({
      title: `刪除 ${p} key？`,
      description: "刪除後此 provider 將無法使用、需重新輸入。",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/user/ai-keys?provider=${p}`, {
      credentials: "include", method: "DELETE" });
    if (res.ok) {
      setKeys(keys.filter((k) => k.provider !== p));
      toast.success(`已刪除 ${p} key`);
    } else {
      toast.error("刪除失敗");
    }
  };

  return (
    <div className="space-y-4">
      {/* 現有 keys */}
      {keys.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl divide-y divide-border">
          {keys.map((k) => {
            const meta = PROVIDERS.find((p) => p.value === k.provider);
            return (
              <div key={k.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">{meta?.label ?? k.provider}</div>
                  <div className="text-xs text-fg-muted">
                    {k.label} · 建立於 {new Date(k.created_at).toLocaleDateString("zh-TW")}
                    {k.last_used_at && ` · 最後使用 ${new Date(k.last_used_at).toLocaleDateString("zh-TW")}`}
                  </div>
                </div>
                <button
                  onClick={() => remove(k.provider)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                >
                  <Trash2 size={16} />
                </button>
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
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <a
              href={PROVIDERS.find((p) => p.value === provider)?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline mt-1 inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> 取得 {provider} API key
            </a>
            <div className="mt-1.5 text-[11px] text-fg-muted">
              這把 key 可解鎖的模型：{PROVIDERS.find((p) => p.value === provider)?.models.join("、")}
              <span className="block mt-0.5">（存好後、在 AI 對話框打開「用自己的 key」就能選這些模型用你的額度）</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-fg-muted mb-1 block">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... / sk-ant-... / etc"
              className="w-full bg-bg border border-border rounded p-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-fg-muted mb-1 block">標籤（選填）</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例：個人 Claude key"
              className="w-full bg-bg border border-border rounded p-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {testResult && (
            <p className={`text-sm flex items-center gap-1.5 ${testResult.ok ? "text-emerald-500" : "text-red-400"}`}>
              {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {testResult.hint}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={testKey}
              disabled={testing || !apiKey}
              className="px-4 py-2 border border-accent text-accent rounded font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : null} 測試
            </button>
            <button
              onClick={save}
              disabled={saving || !apiKey}
              className="px-4 py-2 bg-accent text-black rounded font-semibold disabled:opacity-50"
            >
              {saving ? "儲存中..." : "儲存"}
            </button>
            <button
              onClick={() => { setAdding(false); setApiKey(""); setLabel(""); setError(""); setTestResult(null); }}
              className="px-4 py-2 border border-border rounded text-sm"
            >
              取消
            </button>
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
