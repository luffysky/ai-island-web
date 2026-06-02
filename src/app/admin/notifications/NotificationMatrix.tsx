"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { Bell, Mail, MessageCircle, BellRing, Power, Loader2 } from "lucide-react";
import { Hint } from "@/components/ui/Hint";

type Setting = {
  event_key: string;
  label_zh: string;
  description: string | null;
  category: string | null;
  channels: { in_app: boolean; email: boolean; line: boolean; push: boolean };
  enabled: boolean;
  is_v1: boolean;
};

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  system: { label: "系統 / 客服", emoji: "🔧" },
  security: { label: "安全", emoji: "🔐" },
  learning: { label: "學習", emoji: "📚" },
  commerce: { label: "商務", emoji: "💎" },
  social: { label: "社群", emoji: "💬" },
};

const CHANNEL_META: Array<{ key: "in_app" | "email" | "line" | "push"; label: string; icon: any; color: string }> = [
  { key: "in_app", label: "站內", icon: Bell, color: "text-yellow-400" },
  { key: "email", label: "Email", icon: Mail, color: "text-blue-400" },
  { key: "line", label: "LINE", icon: MessageCircle, color: "text-green-400" },
  { key: "push", label: "Push", icon: BellRing, color: "text-purple-400" },
];

export function NotificationMatrix({ initial }: { initial: Setting[] }) {
  const toast = useToast();
  const [rows, setRows] = useState<Setting[]>(initial);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, Setting[]> = {};
    for (const r of rows) {
      const cat = r.category || "other";
      (g[cat] ||= []).push(r);
    }
    return g;
  }, [rows]);

  const update = async (key: string, patch: Partial<Pick<Setting, "channels" | "enabled">>) => {
    setSavingKey(key);
    // optimistic
    setRows((prev) =>
      prev.map((r) => (r.event_key === key ? { ...r, ...patch, channels: patch.channels ?? r.channels } : r)),
    );
    try {
      const res = await fetch(`/api/admin/notifications/${key}`, {
      credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "儲存失敗");
      }
      toast.success("已儲存");
    } catch (e: any) {
      toast.error(e?.message || "儲存失敗");
      // rollback
      setRows(initial);
    } finally {
      setSavingKey(null);
    }
  };

  const toggleChannel = (row: Setting, ch: "in_app" | "email" | "line" | "push") => {
    const next = { ...row.channels, [ch]: !row.channels[ch] };
    update(row.event_key, { channels: next });
  };

  const toggleEnabled = (row: Setting) => {
    update(row.event_key, { enabled: !row.enabled });
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, list]) => {
        const meta = CATEGORY_META[cat] ?? { label: cat, emoji: "📌" };
        return (
          <section key={cat}>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="text-xs text-fg-muted font-normal">（{list.length}）</span>
            </h2>

            <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 w-[40%]">事件</th>
                    {CHANNEL_META.map((c) => (
                      <th key={c.key} className="px-2 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 ${c.color}`}>
                          <c.icon size={12} />
                          {c.label}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center">
                      <span className="inline-flex items-center">
                        總開關
                        <Hint title="總開關">
                          整個事件的開關。關掉 = 不管 channel 怎麼勾、都不發通知。例如維護期間想暫停某類通知、就關這個。
                        </Hint>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => {
                    const saving = savingKey === row.event_key;
                    return (
                      <tr key={row.event_key} className="border-t border-border">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{row.label_zh}</span>
                            {!row.is_v1 && (
                              <span className="text-[9px] px-1 rounded bg-fg-muted/15 text-fg-muted">v2</span>
                            )}
                            {saving && <Loader2 size={11} className="animate-spin text-accent" />}
                          </div>
                          {row.description && (
                            <div className="text-xs text-fg-muted mt-0.5">{row.description}</div>
                          )}
                          <code className="text-[10px] text-fg-muted font-mono">{row.event_key}</code>
                        </td>
                        {CHANNEL_META.map((c) => (
                          <td key={c.key} className="px-2 py-3 text-center">
                            <Checkbox
                              checked={!!row.channels[c.key]}
                              disabled={!row.enabled || saving}
                              onChange={() => toggleChannel(row, c.key)}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <PowerToggle
                            enabled={row.enabled}
                            disabled={saving}
                            onClick={() => toggleEnabled(row)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <div className="bg-bg-elevated border border-border rounded-xl p-4 text-xs text-fg-muted space-y-1">
        <div className="font-bold text-fg flex items-center gap-1">
          <Power size={11} /> 如何整合
        </div>
        <div>
          在程式碼任何發通知的點、用{" "}
          <code className="bg-bg px-1.5 py-0.5 rounded text-[10px]">{`await isChannelEnabled('event_key', 'line')`}</code>{" "}
          檢查、回 false 就 skip 那個 channel。
        </div>
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`w-5 h-5 rounded inline-flex items-center justify-center transition disabled:opacity-30 ${
        checked
          ? "bg-accent text-black"
          : "bg-bg-elevated border border-border hover:border-accent"
      }`}
      aria-pressed={checked}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function PowerToggle({
  enabled,
  disabled,
  onClick,
}: {
  enabled: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition disabled:opacity-50 ${
        enabled ? "bg-accent" : "bg-bg-elevated border border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
