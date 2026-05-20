"use client";
import { useState } from "react";
import { Trash2, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";

interface UserKey {
  id: string;
  provider: string;
  label: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic Claude", url: "https://console.anthropic.com/settings/keys" },
  { value: "openai", label: "OpenAI GPT", url: "https://platform.openai.com/api-keys" },
  { value: "google", label: "Google Gemini", url: "https://aistudio.google.com/apikey" },
  { value: "groq", label: "Groq (Llama)", url: "https://console.groq.com/keys" },
];

export function AIKeysClient({ initialKeys }: { initialKeys: UserKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/ai-keys", {
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
    if (!confirm(`確定要刪除 ${p} key？`)) return;
    await fetch(`/api/user/ai-keys?provider=${p}`, { method: "DELETE" });
    setKeys(keys.filter((k) => k.provider !== p));
  };

  return (
    <div className="space-y-4">
      {/* 現有 keys */}
      {keys.length > 0 && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
          {keys.map((k) => {
            const meta = PROVIDERS.find((p) => p.value === k.provider);
            return (
              <div key={k.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">{meta?.label ?? k.provider}</div>
                  <div className="text-xs text-[var(--color-fg-muted)]">
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
          className="w-full p-4 border border-dashed border-[var(--color-border)] rounded-xl hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-card)] transition flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} /> 新增 API Key
        </button>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--color-fg-muted)] mb-1 block">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <a
              href={PROVIDERS.find((p) => p.value === provider)?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-accent)] hover:underline mt-1 inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> 取得 {provider} API key
            </a>
          </div>

          <div>
            <label className="text-xs text-[var(--color-fg-muted)] mb-1 block">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... / sk-ant-... / etc"
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--color-fg-muted)] mb-1 block">標籤（選填）</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例：個人 Claude key"
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !apiKey}
              className="px-4 py-2 bg-[var(--color-accent)] text-black rounded font-semibold disabled:opacity-50"
            >
              {saving ? "儲存中..." : "儲存"}
            </button>
            <button
              onClick={() => { setAdding(false); setApiKey(""); setLabel(""); setError(""); }}
              className="px-4 py-2 border border-[var(--color-border)] rounded text-sm"
            >
              取消
            </button>
          </div>

          <p className="text-xs text-[var(--color-fg-muted)]">
            🔒 你的 key 用 AES-256-GCM 加密、僅在你要求 AI 對話時解密、不會被其他人看到。
          </p>
        </div>
      )}

      <Link href="/settings" className="block text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]">
        ← 回設定
      </Link>
    </div>
  );
}
