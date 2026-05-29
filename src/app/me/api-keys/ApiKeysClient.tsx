"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Copy, Eye, EyeOff } from "lucide-react";

type Key = {
  id: string;
  name: string;
  key_prefix: string;
  quota_per_month: number;
  used_this_month: number;
  last_used_at: string | null;
  active: boolean;
  created_at: string;
};

export function ApiKeysClient() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newPlain, setNewPlain] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/me/api-keys", { credentials: "include" });
      const j = await r.json();
      setKeys(j.keys ?? []);
    } finally { setLoading(false); }
  }

  async function create() {
    if (!name.trim()) { alert("給 key 一個名字"); return; }
    setCreating(true);
    try {
      const r = await fetch("/api/me/api-keys", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await r.json();
      if (j.ok) {
        setNewPlain(j.key);
        setReveal(true);
        setName("");
        await load();
      } else {
        alert(`❌ ${j.error}`);
      }
    } finally { setCreating(false); }
  }

  async function disable(id: string) {
    if (!confirm("停用這把 key？之後拿這 key 打 API 都會 403")) return;
    await fetch(`/api/me/api-keys?id=${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => alert("已複製"));
  }

  return (
    <div className="space-y-4">
      {/* 新生成的 key（一次性顯示）*/}
      {newPlain && (
        <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-xl p-4">
          <h3 className="font-bold text-amber-700 dark:text-amber-300 mb-2">⚠️ 新 key（只此一次顯示、立刻複製）</h3>
          <div className="flex items-center gap-2 bg-bg p-2 rounded font-mono text-xs">
            <code className="flex-1 break-all">{reveal ? newPlain : "•".repeat(newPlain.length)}</code>
            <button onClick={() => setReveal(!reveal)} className="p-1">
              {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button onClick={() => copy(newPlain)} className="p-1"><Copy size={14} /></button>
          </div>
          <button onClick={() => setNewPlain(null)} className="text-xs mt-2 text-fg-muted hover:text-fg">
            我已複製、關閉
          </button>
        </div>
      )}

      {/* 新增 */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <h3 className="font-bold mb-2">建新 API key</h3>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：My App / Test"
            className="flex-1 bg-bg-elevated border border-border rounded p-2 text-sm" />
          <button onClick={create} disabled={creating || !name.trim()} className="btn-chip btn-chip-success disabled:opacity-50">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 生成
          </button>
        </div>
        <p className="text-xs text-fg-muted mt-2">每個 key 預設 100 calls / 月、最多 5 把 active key</p>
      </div>

      {/* 已有 keys */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 size={20} className="animate-spin mx-auto" /></div>
      ) : keys.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-fg-muted text-sm">
          還沒 key、上面建一個試試
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className={`bg-bg-card border rounded-xl p-4 ${k.active ? "border-border" : "border-border opacity-50"}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                <div>
                  <h4 className="font-bold">{k.name}</h4>
                  <code className="text-xs text-fg-muted">{k.key_prefix}***</code>
                </div>
                {k.active && (
                  <button onClick={() => disable(k.id)} className="btn-chip btn-chip-danger text-xs">
                    <Trash2 size={12} /> 停用
                  </button>
                )}
                {!k.active && <span className="chip chip-neutral text-xs">已停用</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-fg-muted flex-wrap">
                <span>用量：{k.used_this_month} / {k.quota_per_month}</span>
                {k.last_used_at && <span>最後使用：{new Date(k.last_used_at).toLocaleString("zh-TW")}</span>}
                <span>建立：{new Date(k.created_at).toLocaleDateString("zh-TW")}</span>
              </div>
              <div className="mt-2 h-1.5 bg-bg-elevated rounded overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${Math.min(100, (k.used_this_month / k.quota_per_month) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
