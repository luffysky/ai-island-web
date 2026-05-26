"use client";

import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, AlertTriangle, Loader2, Code } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Setting = {
  key: string;
  value: any;
  description: string | null;
  category: string | null;
  is_secret: boolean;
  value_type: "string" | "number" | "boolean" | "json" | "string_array";
  updated_at: string;
};

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  general: { label: "一般", emoji: "📌" },
  system: { label: "系統", emoji: "🔧" },
  feature: { label: "功能開關", emoji: "🎚️" },
  notification: { label: "通知", emoji: "🔔" },
  email: { label: "Email", emoji: "📧" },
  seo: { label: "SEO", emoji: "🔍" },
  commerce: { label: "商務", emoji: "💎" },
  limits: { label: "限制 / 配額", emoji: "🚦" },
};

const TYPE_META: Record<string, { label: string; emoji: string }> = {
  string: { label: "字串", emoji: "📝" },
  number: { label: "數字", emoji: "🔢" },
  boolean: { label: "開關", emoji: "✅" },
  json: { label: "JSON", emoji: "{ }" },
  string_array: { label: "字串陣列", emoji: "📋" },
};

export function AppSettingsClient({ initial }: { initial: Setting[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Setting[]>(initial);
  const [editing, setEditing] = useState<Setting | null>(null);
  const [creating, setCreating] = useState(false);
  const [reveal, setReveal] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const g: Record<string, Setting[]> = {};
    for (const r of rows) {
      const cat = r.category || "general";
      (g[cat] ||= []).push(r);
    }
    return g;
  }, [rows]);

  const toggleReveal = (key: string) => {
    setReveal((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const refresh = async () => {
    const res = await fetch("/api/admin/app-settings");
    const j = await res.json();
    if (j.settings) setRows(j.settings);
  };

  const remove = async (row: Setting) => {
    const ok = await confirm({
      title: `刪除「${row.key}」？`,
      description: "code 裡若有 getAppSetting('" + row.key + "') 會 fallback 預設值。",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/app-settings/${encodeURIComponent(row.key)}`, {
      credentials: "include", method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setRows((p) => p.filter((r) => r.key !== row.key));
      toast.success("已刪除");
    } catch (e: any) {
      toast.error(e?.message || "刪除失敗");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1"
        >
          <Plus size={14} /> 新增 setting
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-fg-muted text-sm bg-bg-card rounded-xl border border-border">
          還沒有設定、點右上新增。
        </div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => {
          const meta = CATEGORY_META[cat] ?? { label: cat, emoji: "📌" };
          return (
            <section key={cat}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span className="text-xs text-fg-muted font-normal">（{list.length}）</span>
              </h2>
              <div className="space-y-2">
                {list.map((row) => (
                  <SettingRow
                    key={row.key}
                    row={row}
                    revealed={reveal.has(row.key)}
                    onToggleReveal={() => toggleReveal(row.key)}
                    onEdit={() => setEditing(row)}
                    onDelete={() => remove(row)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {(editing || creating) && (
        <SettingModal
          row={editing}
          creating={creating}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function SettingRow({
  row,
  revealed,
  onToggleReveal,
  onEdit,
  onDelete,
}: {
  row: Setting;
  revealed: boolean;
  onToggleReveal: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const display = row.is_secret && !revealed ? "●●●●●●●●" : valuePreview(row.value);
  const typeMeta = TYPE_META[row.value_type] ?? { label: row.value_type, emoji: "📌" };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 hover:border-accent/40 transition">
      <div className="flex items-start gap-2 flex-wrap">
        <code className="text-sm font-mono font-bold text-accent">{row.key}</code>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted inline-flex items-center gap-0.5">
          {typeMeta.emoji} {typeMeta.label}
        </span>
        {row.is_secret && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 inline-flex items-center gap-0.5">
            <AlertTriangle size={10} /> 敏感
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {row.is_secret && (
            <button onClick={onToggleReveal} className="p-1 text-fg-muted hover:text-fg" title={revealed ? "隱藏" : "顯示"}>
              {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          )}
          <button onClick={onEdit} className="p-1 text-fg-muted hover:text-accent" title="編輯">
            <Edit2 size={12} />
          </button>
          <button onClick={onDelete} className="p-1 text-fg-muted hover:text-red-400" title="刪除">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {row.description && <div className="text-xs text-fg-muted mt-1">{row.description}</div>}
      <div className="mt-2 text-xs bg-bg rounded p-2 font-mono break-all overflow-x-auto">{display}</div>
    </div>
  );
}

function valuePreview(v: any): string {
  if (v == null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  return JSON.stringify(v, null, 2);
}

function SettingModal({
  row,
  creating,
  onClose,
  onSaved,
}: {
  row: Setting | null;
  creating: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [key, setKey] = useState(row?.key ?? "");
  const [valueStr, setValueStr] = useState(() => (row ? JSON.stringify(row.value, null, 2) : "null"));
  const [description, setDescription] = useState(row?.description ?? "");
  const [category, setCategory] = useState(row?.category ?? "general");
  const [valueType, setValueType] = useState<Setting["value_type"]>(row?.value_type ?? "json");
  const [isSecret, setIsSecret] = useState(row?.is_secret ?? false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const save = async () => {
    if (creating && !key.trim()) {
      toast.error("key 不能空");
      return;
    }
    if (creating && !/^[a-z][a-z0-9_]*$/.test(key)) {
      toast.error("key 只能小寫字母 + 數字 + 底線、開頭字母");
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(valueStr);
    } catch (e: any) {
      setParseError("JSON 格式錯誤：" + e.message);
      return;
    }
    setParseError(null);
    setSaving(true);
    try {
      const url = creating
        ? "/api/admin/app-settings"
        : `/api/admin/app-settings/${encodeURIComponent(row!.key)}`;
      const res = await fetch(url, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: creating ? key : undefined,
          value: parsed,
          description,
          category,
          value_type: valueType,
          is_secret: isSecret,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(creating ? "已新增" : "已儲存");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold">{creating ? "新增 setting" : `編輯 ${row?.key}`}</h3>
          <button onClick={onClose} className="p-1 text-fg-muted hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {creating && (
            <Field label="Key（不可改、用 snake_case）">
              <input
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase())}
                placeholder="my_custom_setting"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {Object.entries(CATEGORY_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Value type">
              <select
                value={valueType}
                onChange={(e) => setValueType(e.target.value as any)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {Object.entries(TYPE_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="這個 setting 控制什麼？"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </Field>

          <Field label={<span className="inline-flex items-center gap-1"><Code size={12} /> Value (JSON、值的型別需符合 JSON、不只字面 type)</span>}>
            <textarea
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              rows={6}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-accent resize-y"
            />
            <div className="text-[10px] text-fg-muted mt-1">
              範例：字串 <code>"hello"</code>、數字 <code>42</code>、true/false、陣列 <code>["a","b"]</code>、物件 <code>{"{"}"x":1{"}"}</code>
            </div>
            {parseError && <div className="text-[10px] text-red-400 mt-1">{parseError}</div>}
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-sm inline-flex items-center gap-1">
              <AlertTriangle size={12} className="text-yellow-400" /> 標記為敏感（顯示時 mask）
            </span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-bg-card border-t border-border px-4 py-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-border text-sm">
            取消
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {creating ? "建立" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-fg-muted mb-1">{label}</div>
      {children}
    </label>
  );
}
