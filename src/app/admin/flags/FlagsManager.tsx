"use client";

import { useState } from "react";
import { Plus, Loader2, Check, AlertCircle } from "lucide-react";

type Flag = {
  key: string;
  value: any;
  description?: string | null;
  value_type?: string | null;
  category?: string | null;
  updated_at?: string | null;
};

function isOn(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  if (v && typeof v === "object" && "enabled" in v) return !!v.enabled;
  return false;
}

function getRollout(v: any): number {
  if (v && typeof v === "object" && typeof v.rollout === "number") {
    return Math.max(0, Math.min(100, v.rollout));
  }
  return 100;
}

/** 依 on/off + rollout 組出要存進 DB 的 value。rollout=100 → 存純 boolean、否則存物件。 */
function buildValue(on: boolean, rollout: number): any {
  if (rollout >= 100) return on;
  return { enabled: on, rollout };
}

export function FlagsManager({ initial }: { initial: Flag[] }) {
  const [rows, setRows] = useState<Flag[]>(initial);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ key: string; ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  // 呼叫既有 app-settings API 存 value（key 已存在）
  async function saveValue(key: string, value: any) {
    setBusyKey(key);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ key, ok: false, text: `失敗：${data.error ?? res.status}` });
        return false;
      }
      setRows((rs) => rs.map((r) => (r.key === key ? { ...r, value, updated_at: new Date().toISOString() } : r)));
      setMsg({ key, ok: true, text: "已儲存" });
      setTimeout(() => setMsg((m) => (m?.key === key ? null : m)), 2000);
      return true;
    } finally {
      setBusyKey(null);
    }
  }

  function toggle(f: Flag) {
    const next = !isOn(f.value);
    saveValue(f.key, buildValue(next, getRollout(f.value)));
  }

  function setRollout(f: Flag, rollout: number) {
    // 只更新本地 slider、放開時才存（onCommit）
    setRows((rs) =>
      rs.map((r) => (r.key === f.key ? { ...r, value: buildValue(isOn(r.value), rollout) } : r)),
    );
  }

  function commitRollout(f: Flag) {
    saveValue(f.key, f.value);
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-sm text-fg-muted">
          目前沒有功能開關。用下方「新增開關」建立第一個。
        </div>
      )}

      {rows.map((f) => {
        const on = isOn(f.value);
        const rollout = getRollout(f.value);
        const busy = busyKey === f.key;
        return (
          <div key={f.key} className="bg-bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${on ? "text-fg" : "text-fg-muted"}`}>
                    {f.description || f.key}
                  </span>
                  <code className="text-[10px] text-fg-muted font-mono">{f.key}</code>
                  {rollout < 100 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">
                      灰度 {rollout}%
                    </span>
                  )}
                </div>
                {f.updated_at && (
                  <div className="text-[10px] text-fg-muted mt-1">
                    最後修改：{new Date(f.updated_at).toLocaleString("zh-TW")}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {msg?.key === f.key && (
                  <span className={`text-[11px] inline-flex items-center gap-1 ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {msg.ok ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {msg.text}
                  </span>
                )}
                <span className={`text-[10px] font-bold ${on ? "text-emerald-400" : "text-fg-muted"}`}>
                  {on ? "ON" : "OFF"}
                </span>
                <button
                  onClick={() => toggle(f)}
                  disabled={busy}
                  role="switch"
                  aria-checked={on}
                  aria-label={`切換 ${f.key}`}
                  className="relative inline-flex items-center disabled:opacity-50"
                >
                  <span className={`w-10 h-6 rounded-full transition ${on ? "bg-accent" : "bg-bg-elevated"}`} />
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`}
                  />
                  {busy && (
                    <Loader2 className="w-3 h-3 absolute -right-5 animate-spin text-fg-muted" />
                  )}
                </button>
              </div>
            </div>

            {/* 灰度百分比 */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[11px] text-fg-muted w-16 shrink-0">灰度 %</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={rollout}
                disabled={!on || busy}
                onChange={(e) => setRollout(f, Number(e.target.value))}
                onMouseUp={() => commitRollout(f)}
                onTouchEnd={() => commitRollout(f)}
                onKeyUp={() => commitRollout(f)}
                className="flex-1 accent-accent disabled:opacity-40"
              />
              <span className="text-xs font-mono w-10 text-right">{rollout}%</span>
            </div>
            {!on && (
              <p className="text-[10px] text-fg-muted mt-1">開關關閉時灰度不適用。</p>
            )}
          </div>
        );
      })}

      <AddFlagCard
        adding={adding}
        setAdding={setAdding}
        existingKeys={rows.map((r) => r.key)}
        onAdded={(row) => setRows((rs) => [...rs, row].sort((a, b) => a.key.localeCompare(b.key)))}
      />
    </div>
  );
}

function AddFlagCard({
  adding,
  setAdding,
  existingKeys,
  onAdded,
}: {
  adding: boolean;
  setAdding: (v: boolean) => void;
  existingKeys: string[];
  onAdded: (row: Flag) => void;
}) {
  const [key, setKey] = useState("feature_");
  const [desc, setDesc] = useState("");
  const [on, setOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = /^[a-z][a-z0-9_]*$/.test(key);

  async function submit() {
    setErr(null);
    if (!valid) {
      setErr("key 只能小寫字母 / 數字 / 底線，且需字母開頭");
      return;
    }
    if (existingKeys.includes(key)) {
      setErr("這個 key 已存在");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value: on,
          description: desc || null,
          category: "feature",
          value_type: "boolean",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(`失敗：${data.error ?? res.status}`);
        return;
      }
      onAdded({ key, value: on, description: desc || null, category: "feature", value_type: "boolean", updated_at: new Date().toISOString() });
      setKey("feature_");
      setDesc("");
      setOn(false);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="w-full border border-dashed border-border rounded-xl p-3 text-sm text-fg-muted hover:text-accent hover:border-accent/50 transition inline-flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> 新增開關
      </button>
    );
  }

  return (
    <div className="bg-bg-card border border-accent/40 rounded-xl p-4 space-y-3">
      <div className="text-sm font-bold">新增功能開關</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-fg-muted block mb-1">key（建議 feature_xxx_enabled）</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.trim())}
            className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:border-accent outline-none"
            placeholder="feature_new_thing_enabled"
          />
        </label>
        <label className="block">
          <span className="text-xs text-fg-muted block mb-1">說明（顯示名稱）</span>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none"
            placeholder="例：新的實驗功能"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="accent-accent" />
        建立後預設開啟
      </label>
      {err && <p className="text-xs text-red-400 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {err}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={saving || !valid}
          className="text-xs px-3 py-1.5 bg-accent text-black font-bold rounded-lg disabled:opacity-50 inline-flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} 建立
        </button>
        <button
          onClick={() => { setAdding(false); setErr(null); }}
          className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-bg-elevated"
        >
          取消
        </button>
      </div>
    </div>
  );
}
